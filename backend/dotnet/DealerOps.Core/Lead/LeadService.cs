using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Customer;
using DealerOps.Core.Customer.Dto;
using DealerOps.Core.Data;
using DealerOps.Core.Lead.Dto;
using DealerOps.Core.Notifications;
using DealerOps.Core.Vehicle;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace DealerOps.Core.Lead;

/// <summary>
/// Sales leads of the caller's dealership: list, funnel report, create, update and notes.
/// Every change writes a LEAD audit row in the same transaction as the change (LEAD-08, AUD-07).
/// </summary>
public class LeadService
{
    private readonly AppDbContext _db;
    private readonly CustomerService _customerService;
    private readonly IAuditService _audit;
    private readonly NotificationService _notifications;
    private readonly ILogger<LeadService> _logger;

    public LeadService(AppDbContext db, CustomerService customerService, IAuditService audit,
        NotificationService notifications, ILogger<LeadService> logger)
    {
        _db = db;
        _customerService = customerService;
        _audit = audit;
        _notifications = notifications;
        _logger = logger;
    }

    /// <summary>Filtered page of the dealership's leads, newest first.</summary>
    public PageResponse<LeadListItem> List(
        string? q, LeadStage? stage, string? owner, long? customerId, bool? overdue, int page, int size)
    {
        var tenant = TenantGuard.RequireTenantId();
        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);

        IQueryable<LeadEntity> query = _db.Leads.Where(l => l.DealerId == tenant);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            // Leads of a soft-deleted customer stay listed (CRM-14), so the name search must find them too.
            var matchingCustomerIds = _db.Customers.IgnoreQueryFilters()
                .Where(c => c.DealerId == tenant && c.Name.Contains(term))
                .Select(c => c.Id);
            query = query.Where(l => matchingCustomerIds.Contains(l.CustomerId));
        }

        if (stage.HasValue)
            query = query.Where(l => l.Stage == stage.Value);
        if (!string.IsNullOrWhiteSpace(owner))
            query = query.Where(l => l.OwnerUsername == owner.Trim());
        if (customerId.HasValue)
            query = query.Where(l => l.CustomerId == customerId.Value);
        if (overdue == true)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            query = query.Where(l =>
                l.Stage != LeadStage.Won && l.Stage != LeadStage.Lost &&
                l.NextFollowUpOn != null && l.NextFollowUpOn < today);
        }

        var total = query.Count();
        var items = query.OrderByDescending(l => l.CreatedAt).ThenByDescending(l => l.Id)
            .Skip(p * s).Take(s)
            // Materialised before projecting: the projection below queries the database
            // per row, which cannot share the connection with a still-open result set.
            .ToList()
            .Select(lead => new LeadListItem(
                lead.Id,
                lead.CustomerId,
                CustomerName(lead),
                VehicleBrief(lead),
                lead.Stage,
                lead.OwnerUsername,
                lead.NextFollowUpOn,
                IsOverdue(lead),
                lead.Version))
            .ToList();

        return new PageResponse<LeadListItem>(items, p, s, total);
    }

    /// <summary>Lead counts per stage (in pipeline order), win rate and the last 12 months of stage entries, newest month first.</summary>
    public SalesFunnelReport Funnel()
    {
        var tenant = TenantGuard.RequireTenantId();
        var counts = _db.Leads.Where(l => l.DealerId == tenant)
            .GroupBy(l => l.Stage)
            .Select(group => new { Stage = group.Key, Count = group.LongCount() })
            .ToDictionary(row => row.Stage, row => row.Count);
        var total = counts.Values.Sum();
        var stages = Enum.GetValues<LeadStage>().Select(stage =>
        {
            var count = counts.GetValueOrDefault(stage);
            return new FunnelStageCount(EnumWireName.Of(stage), count,
                total == 0 ? 0 : Math.Round((decimal)count * 100 / total, 1));
        }).ToList();
        var won = counts.GetValueOrDefault(LeadStage.Won);
        var closed = won + counts.GetValueOrDefault(LeadStage.Lost);
        var open = counts.Where(c => !c.Key.IsClosed()).Sum(c => c.Value);
        return new SalesFunnelReport(total, open, stages,
            closed == 0 ? 0 : Math.Round((decimal)won * 100 / closed, 1),
            StageHistory(tenant));
    }

    // Every lead create and stage change writes an audit row with the new "stage", so the trail
    // gives the month each lead entered each stage without a separate history table.
    private List<MonthlyLeadStages> StageHistory(long tenant)
    {
        var rows = _db.AuditEvents.AsNoTracking()
            .Where(a => a.DealerId == tenant && a.EntityType == EntityType.Lead && a.FieldSummary != null
                        && (a.Action == AuditAction.Create || a.Action == AuditAction.Update))
            .Select(a => new { a.CreatedAt, a.FieldSummary })
            .ToList();
        var byWire = Enum.GetValues<LeadStage>().ToDictionary(s => EnumWireName.Of(s));
        var entries = new List<(string Month, LeadStage Stage)>();
        foreach (var row in rows)
        {
            using var doc = System.Text.Json.JsonDocument.Parse(row.FieldSummary!);
            if (doc.RootElement.TryGetProperty("stage", out var value)
                && value.GetString() is { } wire && byWire.TryGetValue(wire, out var stage))
                entries.Add(($"{row.CreatedAt.Year:D4}-{row.CreatedAt.Month:D2}", stage));
        }
        return entries
            .GroupBy(e => e.Month)
            .OrderByDescending(g => g.Key)
            .Take(12)
            .Select(g =>
            {
                var monthTotal = g.Count();
                return new MonthlyLeadStages(g.Key, Enum.GetValues<LeadStage>().Select(stage =>
                {
                    long count = g.Count(e => e.Stage == stage);
                    return new FunnelStageCount(EnumWireName.Of(stage), count,
                        Math.Round((decimal)count * 100 / monthTotal, 1));
                }).ToList());
            })
            .ToList();
    }

    /// <summary>Creates a NEW lead for an existing or a new customer, with an optional first note.</summary>
    public LeadDetail Create(CreateLeadRequest body)
    {
        var tenant = TenantGuard.RequireTenantId();
        if ((body.CustomerId == null) == (body.NewCustomer == null))
        {
            _logger.LogWarning(
                "Lead create rejected dealerId={DealerId} reason={Reason} by {Actor}",
                tenant, "customer_choice", TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.Validation, "Choose an existing customer or enter a new one.");
        }

        if (body.CustomerId != null)
        {
            var customer = _db.Customers.FirstOrDefault(c => c.Id == body.CustomerId && c.DealerId == tenant);
            if (customer == null)
            {
                _logger.LogWarning(
                    "Lead create rejected customerId={CustomerId} dealerId={DealerId} code={Code} by {Actor}",
                    body.CustomerId, tenant, ErrorCode.NotFound, TenantContext.ActorUsername());
                throw new ApiException(ErrorCode.NotFound, "Not found");
            }
        }

        var owner = TrimToNull(body.OwnerUsername);
        RequireMember(tenant, owner);
        RequireInStockVehicle(tenant, body.VehicleId);
        var note = OptionalNote(body.Note);

        // The customer, the lead, the first note, and their audit rows commit together (LEAD-01, AUD-07).
        using var tx = _db.Database.BeginTransaction();

        var customerId = body.CustomerId ?? _customerService.Create(body.NewCustomer!).Id;

        var lead = new LeadEntity
        {
            DealerId = tenant,
            CustomerId = customerId,
            VehicleId = body.VehicleId,
            OwnerUsername = owner,
            Stage = LeadStage.New,
            NextFollowUpOn = body.NextFollowUpOn
        };
        _db.Leads.Add(lead);
        _db.SaveChanges();

        var fields = new Dictionary<string, object>
        {
            ["customerId"] = customerId,
            ["stage"] = EnumWireName.Of(LeadStage.New)
        };
        // Optional fields are recorded only when set, so the history shows no empty values.
        if (body.VehicleId != null) fields["vehicleId"] = body.VehicleId;
        if (owner != null) fields["ownerUsername"] = owner;
        if (body.NextFollowUpOn != null) fields["nextFollowUpOn"] = body.NextFollowUpOn.Value.ToString("yyyy-MM-dd");

        Audit(lead.Id, "CREATE", tenant, fields);
        _db.SaveChanges();

        if (note != null)
            WriteNote(lead, note);

        tx.Commit();
        _logger.LogInformation("Lead created leadId={LeadId} customerId={CustomerId} dealerId={DealerId} by {Actor}",
            lead.Id, customerId, tenant, TenantContext.ActorUsername());

        return ToDetail(lead);
    }

    /// <summary>One lead with its notes, newest note first.</summary>
    public LeadDetail Get(long id)
    {
        var tenant = TenantGuard.RequireTenantId();
        return ToDetail(Load(id, tenant));
    }

    /// <summary>
    /// Updates an open lead's stage, owner, follow-up date, vehicle and lost reason under optimistic locking.
    /// The audit row holds the changed fields' new values and, in previous, the values they replaced.
    /// </summary>
    public LeadDetail Patch(long id, PatchLeadRequest body)
    {
        var tenant = TenantGuard.RequireTenantId();
        var lead = Load(id, tenant);
        if (body.Version != lead.Version)
        {
            _logger.LogWarning(
                "Lead update rejected leadId={LeadId} dealerId={DealerId} code={Code} by {Actor}",
                lead.Id, tenant, ErrorCode.VersionConflict, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");
        }
        if (lead.Stage.IsClosed())
        {
            _logger.LogWarning(
                "Change to closed lead rejected leadId={LeadId} stage={Stage} dealerId={DealerId} by {Actor}",
                lead.Id, EnumWireName.Of(lead.Stage), tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.LeadClosed, "Won and lost leads cannot be changed.");
        }

        var owner = TrimToNull(body.OwnerUsername);
        var lostReason = TrimToNull(body.LostReason);

        if (body.Stage == LeadStage.Lost && lostReason == null)
        {
            _logger.LogWarning(
                "Lead update rejected leadId={LeadId} dealerId={DealerId} reason={Reason} by {Actor}",
                lead.Id, tenant, "lost_reason_required", TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.Validation, "A lost lead needs a reason.");
        }
        if (body.Stage != LeadStage.Lost)
            lostReason = null;

        var changed = new Dictionary<string, object>();
        var previous = new Dictionary<string, object?>();
        var oldStage = lead.Stage;
        if (lead.Stage != body.Stage)
        {
            changed["stage"] = EnumWireName.Of(body.Stage);
            previous["stage"] = EnumWireName.Of(lead.Stage);
        }
        if (lead.OwnerUsername != owner)
        {
            RequireMember(tenant, owner);
            changed["ownerUsername"] = owner ?? "";
            previous["ownerUsername"] = lead.OwnerUsername ?? "";
        }
        if (lead.NextFollowUpOn != body.NextFollowUpOn)
        {
            changed["nextFollowUpOn"] = true;
            previous["nextFollowUpOn"] = lead.NextFollowUpOn?.ToString("yyyy-MM-dd");
        }
        if (lead.VehicleId != body.VehicleId)
        {
            RequireInStockVehicle(tenant, body.VehicleId);
            changed["vehicleId"] = body.VehicleId == null ? "" : body.VehicleId;
            previous["vehicleId"] = lead.VehicleId == null ? "" : lead.VehicleId;
        }
        // The reason text is free text and is never copied into the audit; only whether one was set.
        if (lead.LostReason != lostReason)
        {
            changed["lostReason"] = true;
            previous["lostReason"] = lead.LostReason == null ? null : true;
        }

        lead.Stage = body.Stage;
        lead.OwnerUsername = owner;
        lead.NextFollowUpOn = body.NextFollowUpOn;
        lead.VehicleId = body.VehicleId;
        lead.LostReason = lostReason;
        lead.UpdatedAt = DateTime.UtcNow;

        if (changed.Count > 0)
            Audit(lead.Id, "UPDATE", tenant, changed, previous);
        _db.SaveChanges();

        // Someone took the website inquiry: it leaves everyone's inbox once it has an owner or moved on from NEW.
        if (changed.Count > 0 && (lead.OwnerUsername != null || lead.Stage != LeadStage.New))
            _notifications.ResolveByCorrelation(tenant, NotificationService.BuyerInquiry, "leadId", lead.Id.ToString(),
                "TAKEN", TenantContext.ActorUsername());

        if (changed.Count > 0)
            _logger.LogInformation(
                "Lead updated leadId={LeadId} stage={OldStage}->{NewStage} fields={Fields} dealerId={DealerId} by {Actor}",
                lead.Id, EnumWireName.Of(oldStage), EnumWireName.Of(lead.Stage), string.Join(",", changed.Keys), tenant, TenantContext.ActorUsername());

        return ToDetail(lead);
    }

    /// <summary>Adds a note to a lead; the audit row keeps the note id only, never the text.</summary>
    public LeadNoteItem AddNote(long id, AddLeadNoteRequest body)
    {
        var tenant = TenantGuard.RequireTenantId();
        var lead = Load(id, tenant);
        using var tx = _db.Database.BeginTransaction();
        var note = WriteNote(lead, RequireNote(body.Body, "body"));
        tx.Commit();
        _logger.LogInformation("Lead note added noteId={NoteId} leadId={LeadId} dealerId={DealerId} by {Actor}",
            note.Id, lead.Id, tenant, TenantContext.ActorUsername());
        return ToNote(note);
    }

    // Caller owns the transaction, so the note and its audit row commit together with it (AUD-07).
    private LeadNoteEntity WriteNote(LeadEntity lead, string text)
    {
        var note = new LeadNoteEntity
        {
            DealerId = lead.DealerId,
            LeadId = lead.Id,
            AuthorUsername = TenantContext.ActorUsername(),
            Body = text
        };
        _db.LeadNotes.Add(note);
        _db.SaveChanges();
        Audit(lead.Id, "NOTE", lead.DealerId!.Value, new Dictionary<string, object> { ["noteId"] = note.Id });
        _db.SaveChanges();
        return note;
    }

    private LeadDetail ToDetail(LeadEntity lead)
    {
        var notes = _db.LeadNotes
            .Where(n => n.LeadId == lead.Id && n.DealerId == lead.DealerId)
            .OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id)
            .AsEnumerable()
            .Select(ToNote).ToList();

        return new LeadDetail(
            lead.Id, lead.CustomerId, CustomerName(lead), VehicleBrief(lead),
            lead.Stage, lead.OwnerUsername, lead.NextFollowUpOn, IsOverdue(lead),
            lead.LostReason, notes, lead.CreatedAt, lead.Version);
    }

    private static LeadNoteItem ToNote(LeadNoteEntity note)
    {
        return new LeadNoteItem(note.Id, note.AuthorUsername, note.Body, note.CreatedAt);
    }

    // A lead keeps showing its customer and vehicle after either is soft-deleted (lead history).
    private string CustomerName(LeadEntity lead)
    {
        return _db.Customers.IgnoreQueryFilters()
            .Where(c => c.Id == lead.CustomerId && c.DealerId == lead.DealerId)
            .Select(c => c.Name)
            .FirstOrDefault() ?? "";
    }

    private LeadVehicleBrief? VehicleBrief(LeadEntity lead)
    {
        if (lead.VehicleId == null) return null;
        var v = _db.Vehicles.IgnoreQueryFilters().FirstOrDefault(
            v => v.Id == lead.VehicleId && v.DealerId == lead.DealerId);
        return v == null ? null : new LeadVehicleBrief(v.Id, v.Vin, v.ModelYear, v.Make, v.Model, v.Status);
    }

    private static bool IsOverdue(LeadEntity lead)
    {
        return !lead.Stage.IsClosed()
            && lead.NextFollowUpOn != null
            && lead.NextFollowUpOn < DateOnly.FromDateTime(DateTime.UtcNow);
    }

    private void RequireMember(long tenant, string? username)
    {
        if (username != null &&
            !_db.Memberships.Any(m => m.DealerId == tenant && m.Username == username && m.Active))
        {
            _logger.LogWarning(
                "Lead owner rejected dealerId={DealerId} username={Username} code={Code} by {Actor}",
                tenant, username, ErrorCode.Validation, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.Validation, "Owner must be a member of this dealership.");
        }
    }

    private void RequireInStockVehicle(long tenant, long? vehicleId)
    {
        if (vehicleId == null) return;
        var ok = _db.Vehicles.Any(
            v => v.Id == vehicleId && v.DealerId == tenant && v.Status == VehicleStatus.InStock);
        if (!ok)
        {
            _logger.LogWarning(
                "Lead vehicle rejected vehicleId={VehicleId} dealerId={DealerId} code={Code} by {Actor}",
                vehicleId, tenant, ErrorCode.WrongDealerOrSold, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.WrongDealerOrSold, "Vehicle must be in stock at this dealership.");
        }
    }

    private LeadEntity Load(long id, long tenant)
    {
        return _db.Leads.FirstOrDefault(l => l.Id == id && l.DealerId == tenant)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");
    }

    private void Audit(long leadId, string action, long tenant, Dictionary<string, object> fields,
        Dictionary<string, object?>? previous = null)
    {
        _audit.Record("LEAD", leadId, action, tenant, TenantContext.ActorUsername(), fields, previous);
    }

    private static string? TrimToNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    // An omitted create note is fine. A note that was sent, including whitespace, must be 1–2000
    // after trim (LEAD-07). The text itself is never copied into the audit.
    private static string? OptionalNote(string? raw)
    {
        if (raw == null) return null;
        return RequireNote(raw, "note");
    }

    private static string RequireNote(string? raw, string field)
    {
        var text = raw?.Trim() ?? "";
        if (text.Length is < 1 or > 2000)
        {
            const string message = "Note must be 1–2000 characters.";
            throw new ApiException(ErrorCode.Validation, message,
                new Dictionary<string, string> { [field] = message });
        }
        return text;
    }

}
