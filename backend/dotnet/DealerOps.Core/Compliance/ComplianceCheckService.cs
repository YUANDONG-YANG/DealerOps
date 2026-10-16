using System.Text.Json;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Compliance.Dto;
using DealerOps.Core.Data;
using DealerOps.Core.Integration;
using DealerOps.Core.Integration.Dto;
using DealerOps.Core.Listing;
using DealerOps.Core.Listing.Dto;

namespace DealerOps.Core.Compliance;

public class ComplianceCheckService
{
    private readonly AppDbContext _db;
    private readonly OmvicRuleEngine _ruleEngine;
    private readonly CheckStatusMapper _checkStatusMapper;
    private readonly IAiGatewayClient _aiGatewayClient;

    public ComplianceCheckService(
        AppDbContext db, OmvicRuleEngine ruleEngine,
        CheckStatusMapper checkStatusMapper, IAiGatewayClient aiGatewayClient)
    {
        _db = db;
        _ruleEngine = ruleEngine;
        _checkStatusMapper = checkStatusMapper;
        _aiGatewayClient = aiGatewayClient;
    }

    public CheckResponse Check(long listingId, VersionBody body)
    {
        var tenant = RequireTenant();
        var listing = _db.Listings.FirstOrDefault(l => l.Id == listingId && l.DealerId == tenant)
                      ?? throw new ApiException(ErrorCode.NotFound, "Not found");

        if (body.Version != listing.Version)
            throw new ApiException(ErrorCode.VersionConflict, "Version conflict.");

        var evaluatedContentVersion = listing.ContentVersion;
        var vehicle = _db.Vehicles.FirstOrDefault(v => v.Id == listing.VehicleId && v.DealerId == tenant)
                      ?? throw new ApiException(ErrorCode.NotFound, "Not found");
        var dealer = _db.Dealers.Find(tenant)
                     ?? throw new ApiException(ErrorCode.NotFound, "Not found");

        var omvic = _ruleEngine.Run(listing, vehicle, dealer);
        if (omvic.HardBlocked)
        {
            var saved = PersistCheck(listing, evaluatedContentVersion, omvic.Findings,
                AiStatus.Skipped, null, Recommendation.Blocked);
            return ToDto(listing, saved)!;
        }

        try
        {
            var notes = _aiGatewayClient.AdCheckAsync(new AdCheckInternalRequest(
                new ListingPublic(listing.Title, listing.Body,
                    listing.AdKind.ToString(), listing.Medium.ToString()),
                new VehiclePublic(vehicle.ModelYear, vehicle.Make, vehicle.Model,
                    vehicle.Vin, vehicle.ConditionCode.ToString(), vehicle.Source.ToString()),
                new DealerPublic(dealer.LegalName, dealer.ContactPhone,
                    dealer.ContactEmail, dealer.ContactAddress))).GetAwaiter().GetResult();

            var saved = PersistCheck(listing, evaluatedContentVersion, omvic.Findings,
                AiStatus.Success, notes, Recommendation.Passed);
            return ToDto(listing, saved)!;
        }
        catch (AiCallFailed)
        {
            PersistCheck(listing, evaluatedContentVersion, omvic.Findings,
                AiStatus.Unavailable, null, Recommendation.Unavailable);
            throw new ApiException(ErrorCode.AiUnavailable, "Ad check AI is unavailable.");
        }
    }

    public CheckResponse? ToDto(ListingEntity listing, ComplianceCheckEntity? check)
    {
        if (check == null) return null;
        return new CheckResponse(
            check.Id, check.ListingId, check.ContentVersion,
            DeserializeFindings(check.RuleFindingsJson),
            check.AiStatus,
            DeserializeNotes(check.AiNotes) ?? [],
            check.Recommendation,
            _checkStatusMapper.Derive(listing, check),
            check.CreatedAt);
    }

    public ComplianceCheckEntity? LoadCheck(ListingEntity listing)
    {
        if (listing.LastCheckId == null) return null;
        return _db.ComplianceChecks
            .FirstOrDefault(c => c.Id == listing.LastCheckId &&
                                 c.DealerId == listing.DealerId &&
                                 c.ListingId == listing.Id);
    }

    private ComplianceCheckEntity PersistCheck(
        ListingEntity listing, int evaluatedContentVersion,
        List<RuleFinding> findings, AiStatus aiStatus,
        List<AiNote>? notes, Recommendation recommendation)
    {
        var current = _db.Listings.FirstOrDefault(l => l.Id == listing.Id && l.DealerId == listing.DealerId)
                      ?? throw new ApiException(ErrorCode.NotFound, "Not found");

        var check = new ComplianceCheckEntity
        {
            DealerId = current.DealerId,
            ListingId = current.Id,
            ContentVersion = evaluatedContentVersion,
            RuleFindingsJson = JsonSerializer.Serialize(findings),
            AiStatus = aiStatus,
            AiNotes = notes != null ? JsonSerializer.Serialize(notes) : null,
            Recommendation = recommendation,
            CreatedAt = DateTime.UtcNow
        };
        _db.ComplianceChecks.Add(check);
        _db.SaveChanges();

        current.LastCheckId = check.Id;
        listing.LastCheckId = check.Id;
        listing.ContentVersion = current.ContentVersion;
        _db.SaveChanges();
        return check;
    }

    private static List<RuleFinding> DeserializeFindings(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<RuleFinding>>(json) ?? []; }
        catch { return []; }
    }

    private static List<AiNote>? DeserializeNotes(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<List<AiNote>>(json); }
        catch { return null; }
    }

    private static long RequireTenant()
    {
        TenantGuard.RequireDealerUser();
        return TenantContext.Get()!.TenantDealerId!.Value;
    }
}
