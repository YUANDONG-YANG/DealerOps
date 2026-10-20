using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Customer;
using DealerOps.Core.Customer.Dto;
using DealerOps.Core.Data;
using DealerOps.Core.Lead.Dto;
using DealerOps.Core.Vehicle;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Lead;

public class LeadService
{
    private readonly AppDbContext _db;
    private readonly CustomerService _customerService;
    private readonly IAuditService _audit;

    public LeadService(AppDbContext db, CustomerService customerService, IAuditService audit)
    {
        _db = db;
        _customerService = customerService;
        _audit = audit;
    }

    public PageResponse<LeadListItem> List(
        string? q, LeadStage? stage, string? owner, long? customerId, bool? overdue, int page, int size)
    {
        var tenant = RequireTenant();
        var p = Paging.ClampPage(page);
        var s = Paging.ClampSize(size);

        IQueryable<LeadEntity> query = _db.Leads.Where(l => l.DealerId == tenant);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            var matchingCustomerIds = _db.Customers
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

    public SalesFunnelReport Funnel()
    {
        var tenant = RequireTenant();
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
            closed == 0 ? 0 : Math.Round((decimal)won * 100 / closed, 1));
    }

    public LeadDetail Create(CreateLeadRequest body)
    {
        var tenant = RequireTenant();
        if ((body.CustomerId == null) == (body.NewCustomer == null))
            throw new ApiException(ErrorCode.Validation, "Choose an existing customer or enter a new one.");

        if (body.CustomerId != null)
        {
            _ = _db.Customers.FirstOrDefault(c => c.Id == body.CustomerId && c.DealerId == tenant)
                ?? throw new ApiException(ErrorCode.NotFound, "Not found");
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

        return ToDetail(lead);
    }

    public LeadDetail Get(long id)
    {
        var tenant = RequireTenant();
        return ToDetail(Load(id, tenant));
    }

    public LeadDetail Patch(long id, PatchLeadRequest body)
    {
        var tenant = RequireTenant();
        var lead = Load(id, tenant);
        if (body.Version != lead.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");
        if (lead.Stage.IsClosed())
            throw new ApiException(ErrorCode.LeadClosed, "Won and lost leads cannot be changed.");

        var owner = TrimToNull(body.OwnerUsername);
        var lostReason = TrimToNull(body.LostReason);

        if (body.Stage == LeadStage.Lost && lostReason == null)
            throw new ApiException(ErrorCode.Validation, "A lost lead needs a reason.");
        if (body.Stage != LeadStage.Lost)
            lostReason = null;

        var changed = new Dictionary<string, object>();
        if (lead.Stage != body.Stage)
            changed["stage"] = EnumWireName.Of(body.Stage);
        if (lead.OwnerUsername != owner)
        {
            RequireMember(tenant, owner);
            changed["ownerUsername"] = owner ?? "";
        }
        if (lead.NextFollowUpOn != body.NextFollowUpOn)
            changed["nextFollowUpOn"] = true;
        if (lead.VehicleId != body.VehicleId)
        {
            RequireInStockVehicle(tenant, body.VehicleId);
            changed["vehicleId"] = body.VehicleId == null ? "" : body.VehicleId;
        }
        if (lead.LostReason != lostReason)
            changed["lostReason"] = true;

        lead.Stage = body.Stage;
        lead.OwnerUsername = owner;
        lead.NextFollowUpOn = body.NextFollowUpOn;
        lead.VehicleId = body.VehicleId;
        lead.LostReason = lostReason;
        lead.UpdatedAt = DateTime.UtcNow;

        if (changed.Count > 0)
            Audit(lead.Id, "UPDATE", tenant, changed);
        _db.SaveChanges();

        return ToDetail(lead);
    }

    public LeadNoteItem AddNote(long id, AddLeadNoteRequest body)
    {
        var tenant = RequireTenant();
        var lead = Load(id, tenant);
        using var tx = _db.Database.BeginTransaction();
        var note = WriteNote(lead, RequireNote(body.Body, "body"));
        tx.Commit();
        return ToNote(note);
    }

    // Caller owns the transaction, so the note and its audit row commit together with it (AUD-07).
    private LeadNoteEntity WriteNote(LeadEntity lead, string text)
    {
        var note = new LeadNoteEntity
        {
            DealerId = lead.DealerId,
            LeadId = lead.Id,
            AuthorUsername = ActorUsername(),
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
            throw new ApiException(ErrorCode.Validation, "Owner must be a member of this dealership.");
    }

    private void RequireInStockVehicle(long tenant, long? vehicleId)
    {
        if (vehicleId == null) return;
        var ok = _db.Vehicles.Any(
            v => v.Id == vehicleId && v.DealerId == tenant && v.Status == VehicleStatus.InStock);
        if (!ok)
            throw new ApiException(ErrorCode.WrongDealerOrSold, "Vehicle must be in stock at this dealership.");
    }

    private LeadEntity Load(long id, long tenant)
    {
        return _db.Leads.FirstOrDefault(l => l.Id == id && l.DealerId == tenant)
            ?? throw new ApiException(ErrorCode.NotFound, "Not found");
    }

    private void Audit(long leadId, string action, long tenant, Dictionary<string, object> fields)
    {
        _audit.Record("LEAD", leadId, action, tenant, ActorUsername(), fields);
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

    private static long RequireTenant()
    {
        TenantGuard.RequireDealerUser();
        return TenantContext.Get()!.TenantDealerId!.Value;
    }

    private static string ActorUsername() => TenantContext.Get()?.Username ?? "";
}
