using System.Text.Json;
using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Compliance.Dto;
using DealerOps.Core.Data;
using DealerOps.Core.Integration;
using DealerOps.Core.Integration.Dto;
using DealerOps.Core.Listing;
using DealerOps.Core.Listing.Dto;
using DealerOps.Core.Vehicle;

namespace DealerOps.Core.Compliance;

public class ComplianceCheckService
{
    // Stored JSON uses the 14 §8.1 element shape (camelCase); reads stay case-insensitive so rows
    // written with PascalCase keys still load.
    private static readonly JsonSerializerOptions StoredJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly AppDbContext _db;
    private readonly OmvicRuleEngine _ruleEngine;
    private readonly CheckStatusMapper _checkStatusMapper;
    private readonly IAiGatewayClient _aiGatewayClient;
    private readonly ComplianceRuleService _ruleSettings;

    public ComplianceCheckService(
        AppDbContext db, OmvicRuleEngine ruleEngine,
        CheckStatusMapper checkStatusMapper, IAiGatewayClient aiGatewayClient,
        ComplianceRuleService ruleSettings)
    {
        _db = db;
        _ruleEngine = ruleEngine;
        _checkStatusMapper = checkStatusMapper;
        _aiGatewayClient = aiGatewayClient;
        _ruleSettings = ruleSettings;
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
        var overrides = _ruleSettings.Overrides();
        var findings = omvic.Findings
            .Where(f => !overrides.TryGetValue(f.RuleId, out var rule) || rule.Enabled)
            .Select(f => overrides.TryGetValue(f.RuleId, out var rule)
                ? f with { Severity = rule.Severity ?? f.Severity, Message = rule.Message ?? f.Message }
                : f)
            .ToList();
        var hardBlocked = findings.Any(f => string.Equals(f.Severity, "BLOCK", StringComparison.OrdinalIgnoreCase));
        if (hardBlocked)
        {
            var saved = PersistCheck(listing, evaluatedContentVersion, findings,
                AiStatus.Skipped, null, Recommendation.Blocked);
            return ToDto(listing, saved)!;
        }

        try
        {
            var notes = _aiGatewayClient.AdCheckAsync(new AdCheckInternalRequest(
                new ListingPublic(listing.Title, listing.Body,
                    EnumSnakeCaseConverter<AdKind>.ToWire(listing.AdKind),
                    EnumSnakeCaseConverter<AdMedium>.ToWire(listing.Medium)),
                new VehiclePublic(vehicle.ModelYear, vehicle.Make, vehicle.Model, vehicle.Vin,
                    EnumSnakeCaseConverter<ConditionCode>.ToWire(vehicle.ConditionCode),
                    EnumSnakeCaseConverter<VehicleSource>.ToWire(vehicle.Source)),
                new DealerPublic(dealer.LegalName, dealer.ContactPhone,
                    dealer.ContactEmail, dealer.ContactAddress))).GetAwaiter().GetResult();

            var saved = PersistCheck(listing, evaluatedContentVersion, findings,
                AiStatus.Success, notes, Recommendation.Passed);
            return ToDto(listing, saved)!;
        }
        catch (AiCallFailed)
        {
            PersistCheck(listing, evaluatedContentVersion, findings,
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
            RuleFindingsJson = JsonSerializer.Serialize(findings, StoredJson),
            AiStatus = aiStatus,
            AiNotes = notes != null ? JsonSerializer.Serialize(notes, StoredJson) : null,
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
        try { return JsonSerializer.Deserialize<List<RuleFinding>>(json, StoredJson) ?? []; }
        catch { return []; }
    }

    private static List<AiNote>? DeserializeNotes(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<List<AiNote>>(json, StoredJson)?
                .Select(n => n with
                {
                    Code = string.IsNullOrWhiteSpace(n.Code) ? "NOTE" : n.Code,
                    Severity = AiNoteSeverity.Normalize(n.Severity),
                    Explanation = string.IsNullOrWhiteSpace(n.Explanation) ? n.Message : n.Explanation,
                })
                .ToList();
        }
        catch { return null; }
    }

    private static long RequireTenant()
    {
        TenantGuard.RequireDealerUser();
        return TenantContext.Get()!.TenantDealerId!.Value;
    }
}
