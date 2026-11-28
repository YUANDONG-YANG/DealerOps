using DealerOps.Core.Audit;
using DealerOps.Core.Common;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Compliance;
using DealerOps.Core.Data;
using DealerOps.Core.Listing.Dto;
using DealerOps.Core.Vehicle;

namespace DealerOps.Core.Listing;

/// <summary>
/// Owns a vehicle's ad listing: draft edits, the READY mark and the TXT export. Every change and
/// every export writes a LISTING audit row in the same unit of work (AUD-07); the ad text is the
/// business record, so the trail keeps old and new text, clipped to <see cref="AuditTextLimit"/>.
/// </summary>
public class ListingService
{
    /// <summary>Longest free-text value stored in one audit field.</summary>
    private const int AuditTextLimit = 500;

    private readonly AppDbContext _db;
    private readonly ComplianceCheckService _complianceCheckService;
    private readonly CheckStatusMapper _checkStatusMapper;
    private readonly IAuditService _audit;
    private readonly ILogger<ListingService> _logger;

    public ListingService(AppDbContext db, ComplianceCheckService complianceCheckService,
        CheckStatusMapper checkStatusMapper, IAuditService audit, ILogger<ListingService> logger)
    {
        _db = db;
        _complianceCheckService = complianceCheckService;
        _checkStatusMapper = checkStatusMapper;
        _audit = audit;
        _logger = logger;
    }

    /// <summary>Returns the vehicle's listing, or an unsaved empty draft when none exists yet.</summary>
    public ListingResponse GetByVehicle(long vehicleId)
    {
        var tenant = TenantGuard.RequireTenantId();
        RequireVehicle(vehicleId, tenant);

        var listing = _db.Listings.FirstOrDefault(l => l.VehicleId == vehicleId && l.DealerId == tenant);
        return listing != null ? ToResponse(listing) : VirtualDraft(vehicleId);
    }

    /// <summary>
    /// Creates the listing on the first save, otherwise applies the present fields. A real content
    /// change bumps the content version and returns the ad to DRAFT; a no-op save writes nothing.
    /// </summary>
    public ListingResponse PatchByVehicle(long vehicleId, PatchListingRequest body)
    {
        var tenant = TenantGuard.RequireTenantId();
        RequireVehicle(vehicleId, tenant);

        var row = _db.Listings.FirstOrDefault(l => l.VehicleId == vehicleId && l.DealerId == tenant);
        if (row == null)
        {
            if (body.Version != null && body.Version != 0)
                throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

            row = new ListingEntity
            {
                DealerId = tenant,
                VehicleId = vehicleId,
                Title = BlankToEmpty(body.Title),
                Body = BlankToEmpty(body.Body),
                AdKind = body.AdKind ?? AdKind.Cash,
                Medium = body.Medium ?? AdMedium.Online,
                PriorUse = body.PriorUse,
                WarrantyTerms = body.WarrantyTerms,
                AnnualKmAllowance = body.AnnualKmAllowance,
                Status = ListingStatus.Draft,
                ContentVersion = 1,
                LastCheckId = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            // The audit row needs the generated id, so both saves share one transaction.
            using var tx = _db.Database.BeginTransaction();
            _db.Listings.Add(row);
            _db.SaveChanges();
            _audit.Record("LISTING", row.Id, "CREATE", tenant, TenantContext.ActorUsername(), CreatedFields(row));
            _db.SaveChanges();
            tx.Commit();
            _logger.LogInformation("Listing created listingId={ListingId} vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
                row.Id, vehicleId, tenant, TenantContext.ActorUsername());
        }
        else
        {
            if (body.Version == null || body.Version != row.Version)
                throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

            // Only a real content change invalidates a passed check (AD-11); re-saving the same
            // text must not push a PASSED ad to STALE.
            var changes = new Dictionary<string, object> { ["vehicleId"] = vehicleId };
            var previous = new Dictionary<string, object?>();
            if (ApplyPresentFields(row, body, changes, previous))
            {
                previous["contentVersion"] = row.ContentVersion;
                row.ContentVersion++;
                changes["contentVersion"] = row.ContentVersion;
                if (row.Status != ListingStatus.Draft)
                {
                    previous["status"] = EnumWireName.Of(row.Status);
                    row.Status = ListingStatus.Draft;
                    changes["status"] = EnumWireName.Of(row.Status);
                }
                row.UpdatedAt = DateTime.UtcNow;
                _audit.Record("LISTING", row.Id, "UPDATE", tenant, TenantContext.ActorUsername(), changes, previous);
                _db.SaveChanges();
                _logger.LogInformation("Listing updated listingId={ListingId} vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
                    row.Id, vehicleId, tenant, TenantContext.ActorUsername());
            }
        }

        return GetByVehicle(vehicleId);
    }

    /// <summary>Marks a listing whose current content passed its check as READY.</summary>
    public ListingResponse Ready(long listingId, VersionBody body)
    {
        var listing = AssertExportable(listingId, body.Version);
        var oldStatus = EnumWireName.Of(listing.Status);
        listing.Status = ListingStatus.Ready;
        listing.UpdatedAt = DateTime.UtcNow;
        _audit.Record("LISTING", listing.Id, "UPDATE", listing.DealerId, TenantContext.ActorUsername(),
            new Dictionary<string, object>
            {
                ["vehicleId"] = listing.VehicleId,
                ["status"] = EnumWireName.Of(listing.Status)
            },
            new Dictionary<string, object?> { ["status"] = oldStatus });
        _db.SaveChanges();
        _logger.LogInformation("Listing marked ready listingId={ListingId} vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
            listing.Id, listing.VehicleId, listing.DealerId, TenantContext.ActorUsername());
        return ToResponse(listing);
    }

    /// <summary>
    /// Builds the plain-text ad of a listing whose current content passed its check, and records
    /// the export with the content version that left the system.
    /// </summary>
    public string Export(long listingId, VersionBody body)
    {
        var listing = AssertExportable(listingId, body.Version);
        var tenant = listing.DealerId;
        var dealer = _db.Dealers.Find(tenant)
                     ?? throw new ApiException(ErrorCode.NotFound, "Not found");
        var vehicle = _db.Vehicles.FirstOrDefault(v => v.Id == listing.VehicleId && v.DealerId == tenant)
                      ?? throw new ApiException(ErrorCode.NotFound, "Not found");
        var last = _complianceCheckService.LoadCheck(listing);

        // Public ad content only: no customer data and no cost figures (AD-13).
        var text = new System.Text.StringBuilder();
        text.Append("Dealer: ").AppendLine(dealer.LegalName);
        text.Append("Phone: ").AppendLine(dealer.ContactPhone);
        text.Append("Email: ").AppendLine(dealer.ContactEmail);
        text.Append("Address: ").AppendLine(dealer.ContactAddress);
        text.Append("Vehicle: ").Append(vehicle.ModelYear).Append(' ')
            .Append(vehicle.Make).Append(' ').AppendLine(vehicle.Model);
        text.Append("VIN: ").AppendLine(vehicle.Vin);
        text.Append("Condition: ")
            .AppendLine(EnumLabel(EnumSnakeCaseConverter<ConditionCode>.ToWire(vehicle.ConditionCode)));
        text.Append("Source: ")
            .AppendLine(EnumLabel(EnumSnakeCaseConverter<VehicleSource>.ToWire(vehicle.Source)));
        text.Append("Title: ").AppendLine(listing.Title);
        text.Append("Body: ").AppendLine(listing.Body);
        if (last != null)
            text.Append("Checked at: ").AppendLine(
                DateTime.SpecifyKind(last.CreatedAt, DateTimeKind.Utc).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"));
        text.AppendLine()
            .AppendLine("This check is not legal advice and is not an OMVIC approval. Confirm current disclosure requirements with OMVIC before publishing.");

        _audit.Record("LISTING", listing.Id, "EXPORT", tenant, TenantContext.ActorUsername(),
            new Dictionary<string, object>
            {
                ["vehicleId"] = listing.VehicleId,
                ["contentVersion"] = listing.ContentVersion
            });
        _db.SaveChanges();
        _logger.LogInformation("Listing exported listingId={ListingId} vehicleId={VehicleId} contentVersion={ContentVersion} dealerId={DealerId} by {Actor}",
            listing.Id, listing.VehicleId, listing.ContentVersion, tenant, TenantContext.ActorUsername());

        return text.ToString();
    }

    // The same wording as the web's enumLabel: "AS_IS" -> "As-is", "TRADE_IN" -> "Trade in".
    private static string EnumLabel(string wire)
    {
        if (wire == "AS_IS") return "As-is";
        var words = wire.Replace('_', ' ').ToLowerInvariant();
        return words.Length == 0 ? words : char.ToUpperInvariant(words[0]) + words[1..];
    }

    private ListingEntity AssertExportable(long listingId, int version)
    {
        var tenant = TenantGuard.RequireTenantId();
        var listing = _db.Listings.FirstOrDefault(l => l.Id == listingId && l.DealerId == tenant)
                      ?? throw new ApiException(ErrorCode.NotFound, "Not found");

        if (version != listing.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        var last = _complianceCheckService.LoadCheck(listing);
        if (last == null || last.Recommendation != Recommendation.Passed)
        {
            _logger.LogWarning(
                "Listing ready or export rejected because the check has not passed listingId={ListingId} vehicleId={VehicleId} dealerId={DealerId} by {Actor}",
                listing.Id, listing.VehicleId, tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.NotPassed, "Listing has not passed the current check.");
        }

        if (CheckStatusMapper.Stale == _checkStatusMapper.Derive(listing, last))
        {
            _logger.LogWarning(
                "Listing ready or export rejected because the check is stale listingId={ListingId} vehicleId={VehicleId} contentVersion={ContentVersion} dealerId={DealerId} by {Actor}",
                listing.Id, listing.VehicleId, listing.ContentVersion, tenant, TenantContext.ActorUsername());
            throw new ApiException(ErrorCode.CheckStale, "Check is stale.");
        }

        return listing;
    }

    private ListingResponse ToResponse(ListingEntity listing)
    {
        var last = _complianceCheckService.LoadCheck(listing);
        return new ListingResponse(
            listing.Id,
            listing.VehicleId,
            listing.Title,
            listing.Body,
            listing.AdKind,
            listing.Medium,
            listing.PriorUse,
            listing.WarrantyTerms,
            listing.AnnualKmAllowance,
            listing.Status,
            listing.ContentVersion,
            listing.LastCheckId,
            _complianceCheckService.ToDto(listing, last),
            _checkStatusMapper.Derive(listing, last),
            listing.Version);
    }

    private static ListingResponse VirtualDraft(long vehicleId) =>
        new(0, vehicleId, "", "", AdKind.Cash, AdMedium.Online, null, null, null, ListingStatus.Draft,
            1, null, null, CheckStatusMapper.NeedsAi, 0);

    private void RequireVehicle(long vehicleId, long tenant)
    {
        if (!_db.Vehicles.Any(v => v.Id == vehicleId && v.DealerId == tenant))
            throw new ApiException(ErrorCode.NotFound, "Not found");
    }

    // Applies the fields present in the request and records each real change: the new value in
    // changes and the replaced value in previous.
    private static bool ApplyPresentFields(ListingEntity row, PatchListingRequest body,
        Dictionary<string, object> changes, Dictionary<string, object?> previous)
    {
        var changed = false;
        if (body.Title != null && row.Title != BlankToEmpty(body.Title))
        {
            Track(changes, previous, "title", Clip(row.Title), Clip(BlankToEmpty(body.Title)));
            row.Title = BlankToEmpty(body.Title);
            changed = true;
        }
        if (body.Body != null && row.Body != BlankToEmpty(body.Body))
        {
            Track(changes, previous, "body", Clip(row.Body), Clip(BlankToEmpty(body.Body)));
            row.Body = BlankToEmpty(body.Body);
            changed = true;
        }
        if (body.AdKind != null && row.AdKind != body.AdKind.Value)
        {
            Track(changes, previous, "adKind", EnumWireName.Of(row.AdKind), EnumWireName.Of(body.AdKind.Value));
            row.AdKind = body.AdKind.Value;
            changed = true;
        }
        if (body.Medium != null && row.Medium != body.Medium.Value)
        {
            Track(changes, previous, "medium", EnumWireName.Of(row.Medium), EnumWireName.Of(body.Medium.Value));
            row.Medium = body.Medium.Value;
            changed = true;
        }
        if (row.PriorUse != body.PriorUse)
        {
            Track(changes, previous, "priorUse", row.PriorUse, body.PriorUse);
            row.PriorUse = body.PriorUse;
            changed = true;
        }
        if (row.WarrantyTerms != body.WarrantyTerms)
        {
            Track(changes, previous, "warrantyTerms", Clip(row.WarrantyTerms), Clip(body.WarrantyTerms));
            row.WarrantyTerms = body.WarrantyTerms;
            changed = true;
        }
        if (row.AnnualKmAllowance != body.AnnualKmAllowance)
        {
            Track(changes, previous, "annualKmAllowance", row.AnnualKmAllowance, body.AnnualKmAllowance);
            row.AnnualKmAllowance = body.AnnualKmAllowance;
            changed = true;
        }
        return changed;
    }

    // A null new value records a cleared field; the serializer writes it as JSON null.
    private static void Track(Dictionary<string, object> changes, Dictionary<string, object?> previous,
        string field, object? oldValue, object? newValue)
    {
        changes[field] = newValue!;
        previous[field] = oldValue;
    }

    // Initial content of a new listing; empty optional fields are left out.
    private static Dictionary<string, object> CreatedFields(ListingEntity row)
    {
        var fields = new Dictionary<string, object>
        {
            ["vehicleId"] = row.VehicleId,
            ["adKind"] = EnumWireName.Of(row.AdKind),
            ["medium"] = EnumWireName.Of(row.Medium)
        };
        if (row.Title != "") fields["title"] = Clip(row.Title)!;
        if (row.Body != "") fields["body"] = Clip(row.Body)!;
        if (row.PriorUse != null) fields["priorUse"] = row.PriorUse;
        if (row.WarrantyTerms != null) fields["warrantyTerms"] = Clip(row.WarrantyTerms)!;
        if (row.AnnualKmAllowance != null) fields["annualKmAllowance"] = row.AnnualKmAllowance.Value;
        return fields;
    }

    private static string? Clip(string? value) =>
        value != null && value.Length > AuditTextLimit ? value[..AuditTextLimit] : value;

    private static string BlankToEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "" : value;

}
