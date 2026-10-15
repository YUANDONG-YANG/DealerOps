using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Compliance;
using DealerOps.Core.Data;
using DealerOps.Core.Listing.Dto;
using DealerOps.Core.Vehicle;

namespace DealerOps.Core.Listing;

public class ListingService
{
    private readonly AppDbContext _db;
    private readonly ComplianceCheckService _complianceCheckService;
    private readonly CheckStatusMapper _checkStatusMapper;

    public ListingService(AppDbContext db, ComplianceCheckService complianceCheckService,
        CheckStatusMapper checkStatusMapper)
    {
        _db = db;
        _complianceCheckService = complianceCheckService;
        _checkStatusMapper = checkStatusMapper;
    }

    public ListingResponse GetByVehicle(long vehicleId)
    {
        var tenant = RequireTenant();
        RequireVehicle(vehicleId, tenant);

        var listing = _db.Listings.FirstOrDefault(l => l.VehicleId == vehicleId && l.DealerId == tenant);
        return listing != null ? ToResponse(listing) : VirtualDraft(vehicleId);
    }

    public ListingResponse PatchByVehicle(long vehicleId, PatchListingRequest body)
    {
        var tenant = RequireTenant();
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
                Status = ListingStatus.Draft,
                ContentVersion = 1,
                LastCheckId = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Listings.Add(row);
            _db.SaveChanges();
        }
        else
        {
            if (body.Version == null || body.Version != row.Version)
                throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

            // Only a real content change invalidates a passed check (AD-11); re-saving the same
            // text must not push a PASSED ad to STALE.
            if (ApplyPresentFields(row, body))
            {
                row.ContentVersion++;
                row.Status = ListingStatus.Draft;
                row.UpdatedAt = DateTime.UtcNow;
                _db.SaveChanges();
            }
        }

        return GetByVehicle(vehicleId);
    }

    public ListingResponse Ready(long listingId, VersionBody body)
    {
        var listing = AssertExportable(listingId, body.Version);
        listing.Status = ListingStatus.Ready;
        listing.UpdatedAt = DateTime.UtcNow;
        _db.SaveChanges();
        return ToResponse(listing);
    }

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
            .AppendLine(EnumSnakeCaseConverter<ConditionCode>.ToWire(vehicle.ConditionCode));
        text.Append("Title: ").AppendLine(listing.Title);
        text.Append("Body: ").AppendLine(listing.Body);
        if (last != null)
            text.Append("Checked at: ").AppendLine(
                DateTime.SpecifyKind(last.CreatedAt, DateTimeKind.Utc).ToString("O"));

        return text.ToString();
    }

    private ListingEntity AssertExportable(long listingId, int version)
    {
        var tenant = RequireTenant();
        var listing = _db.Listings.FirstOrDefault(l => l.Id == listingId && l.DealerId == tenant)
                      ?? throw new ApiException(ErrorCode.NotFound, "Not found");

        if (version != listing.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        var last = _complianceCheckService.LoadCheck(listing);
        if (last == null || last.Recommendation != Recommendation.Passed)
            throw new ApiException(ErrorCode.NotPassed, "Listing has not passed the current check.");

        if (CheckStatusMapper.Stale == _checkStatusMapper.Derive(listing, last))
            throw new ApiException(ErrorCode.CheckStale, "Check is stale.");

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
            listing.Status,
            listing.ContentVersion,
            listing.LastCheckId,
            _complianceCheckService.ToDto(listing, last),
            _checkStatusMapper.Derive(listing, last),
            listing.Version);
    }

    private static ListingResponse VirtualDraft(long vehicleId) =>
        new(0, vehicleId, "", "", AdKind.Cash, AdMedium.Online, ListingStatus.Draft,
            1, null, null, CheckStatusMapper.NeedsAi, 0);

    private void RequireVehicle(long vehicleId, long tenant)
    {
        if (!_db.Vehicles.Any(v => v.Id == vehicleId && v.DealerId == tenant))
            throw new ApiException(ErrorCode.NotFound, "Not found");
    }

    private static bool ApplyPresentFields(ListingEntity row, PatchListingRequest body)
    {
        var changed = false;
        if (body.Title != null && row.Title != BlankToEmpty(body.Title))
        {
            row.Title = BlankToEmpty(body.Title);
            changed = true;
        }
        if (body.Body != null && row.Body != BlankToEmpty(body.Body))
        {
            row.Body = BlankToEmpty(body.Body);
            changed = true;
        }
        if (body.AdKind != null && row.AdKind != body.AdKind.Value)
        {
            row.AdKind = body.AdKind.Value;
            changed = true;
        }
        if (body.Medium != null && row.Medium != body.Medium.Value)
        {
            row.Medium = body.Medium.Value;
            changed = true;
        }
        return changed;
    }

    private static string BlankToEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "" : value;

    private static long RequireTenant()
    {
        TenantGuard.RequireDealerUser();
        return TenantContext.Get()!.TenantDealerId!.Value;
    }
}
