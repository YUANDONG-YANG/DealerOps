using DealerOps.Core.Common.Exceptions;
using DealerOps.Core.Common.Tenant;
using DealerOps.Core.Data;
using DealerOps.Core.Listing;
using Microsoft.EntityFrameworkCore;

namespace DealerOps.Core.Compliance;

public class ComplianceRuleService
{
    // Severity matches what OmvicRuleEngine raises. The message is a summary for the editor: the
    // engine words some findings more specifically, and that wording stays unless an admin replaces it.
    private static readonly IReadOnlyDictionary<string, (string Severity, string Message)> Defaults =
        new Dictionary<string, (string, string)>(StringComparer.Ordinal)
        {
            ["PRICE_MISSING"] = ("BLOCK", "Advertised price not found in the ad body."),
            ["DEALER_NAME_MISSING"] = ("BLOCK", "Dealership legal name is missing from the ad."),
            ["DEALER_CONTACT_MISSING"] = ("BLOCK", "Dealership contact details are missing from the ad."),
            ["DEALER_CONTACT_INCOMPLETE"] = ("REVIEW", "Dealership contact details look incomplete."),
            ["YEAR_NOT_IN_COPY"] = ("REVIEW", "Model year is not present in the ad copy."),
            ["YEAR_NEW_USED_CONTRADICTION"] = ("REVIEW", "Copy implies new while the model year is older."),
            ["CONDITION_UNDISCLOSED"] = ("BLOCK", "Vehicle condition is not disclosed."),
            ["CONDITION_MISMATCH"] = ("BLOCK", "Vehicle condition in the ad does not match the vehicle record."),
            ["CERTIFIED_NOT_IN_COPY"] = ("REVIEW", "Certification is not supported by the vehicle record."),
            ["NEW_USED_NOT_STATED"] = ("REVIEW", "New or used status is not stated."),
            ["PRIOR_USE_UNCLEAR"] = ("REVIEW", "Prior use may need disclosure."),
            ["WARRANTY_CLAIM_NEEDS_REVIEW"] = ("REVIEW", "Warranty claim needs review."),
            ["WARRANTY_TERMS_MISSING"] = ("REVIEW", "Extended warranty terms are missing."),
            ["FINANCE_APR_MISSING"] = ("BLOCK", "Finance APR is missing."),
            ["FINANCE_APR_PROXIMITY"] = ("REVIEW", "Finance APR may not be clearly associated with the offer."),
            ["FINANCE_TERM_MISSING"] = ("REVIEW", "Finance term is missing."),
            ["FINANCE_CASH_PRICE_MISSING"] = ("BLOCK", "Cash price is missing from the finance ad."),
            ["LEASE_STATEMENT_MISSING"] = ("BLOCK", "Required lease statement is missing."),
            ["LEASE_RENT_MISSING"] = ("REVIEW", "Lease rent is missing."),
            ["LEASE_TERM_MISSING"] = ("REVIEW", "Lease term is missing."),
            ["LEASE_DOWN_MISSING"] = ("REVIEW", "Lease down payment disclosure is missing."),
            ["LEASE_APR_MISSING"] = ("BLOCK", "Lease APR is missing."),
            ["LEASE_ALLOWANCE_UNSTATED"] = ("REVIEW", "Annual kilometre allowance is not stated."),
            ["LEASE_ALLOWANCE_NOT_IN_COPY"] = ("REVIEW", "Annual kilometre allowance is not present in the ad."),
            ["LEASE_ALLOWANCE_MISMATCH"] = ("REVIEW", "Annual kilometre allowance in the ad differs from the salesperson checklist."),
            ["LEASE_EXCESS_KM_MISSING"] = ("BLOCK", "Excess kilometre fees are missing.")
        };

    private readonly AppDbContext _db;

    public ComplianceRuleService(AppDbContext db) => _db = db;

    public IReadOnlyList<Dto.RuleOverrideResponse> List()
    {
        RequireAdmin();
        var saved = _db.RuleOverrides.AsNoTracking().ToDictionary(x => x.RuleId, StringComparer.Ordinal);
        return Defaults.Select(pair => ToResponse(pair.Key, saved.GetValueOrDefault(pair.Key))).ToList();
    }

    public Dto.RuleOverrideResponse Update(string ruleId, Dto.UpdateRuleOverrideRequest request)
    {
        RequireAdmin();
        if (!Defaults.ContainsKey(ruleId)) throw new ApiException(ErrorCode.NotFound, "Unknown compliance rule.");
        var severity = string.IsNullOrWhiteSpace(request.Severity) ? null : request.Severity.Trim().ToUpperInvariant();
        if (severity is not null and not ("BLOCK" or "REVIEW"))
            throw new ApiException(ErrorCode.Validation, "Severity must be BLOCK or REVIEW.");
        var message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim();
        if (message?.Length > 500) throw new ApiException(ErrorCode.Validation, "Message must be 500 characters or fewer.");

        var row = _db.RuleOverrides.FirstOrDefault(x => x.RuleId == ruleId);
        if (row == null)
        {
            row = new RuleOverrideEntity { RuleId = ruleId };
            _db.RuleOverrides.Add(row);
        }
        // A value equal to the default is not stored, so the engine's own severity and its
        // finding-specific wording keep applying when an admin only toggles or re-saves a rule.
        var baseline = Defaults[ruleId];
        row.Enabled = request.Enabled;
        row.Severity = severity == baseline.Severity ? null : severity;
        row.Message = message == baseline.Message ? null : message;
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = TenantContext.Get()!.Username;

        // A changed rule set invalidates every prior check, so ads must be rechecked before Ready/export.
        foreach (var listing in _db.Listings.IgnoreQueryFilters().ToList())
            listing.ContentVersion++;
        _db.SaveChanges();
        return ToResponse(ruleId, row);
    }

    public IReadOnlyDictionary<string, RuleOverrideEntity> Overrides() =>
        _db.RuleOverrides.AsNoTracking().ToDictionary(x => x.RuleId, StringComparer.Ordinal);

    private static Dto.RuleOverrideResponse ToResponse(string id, RuleOverrideEntity? row)
    {
        var baseline = Defaults[id];
        return new Dto.RuleOverrideResponse(id, row?.Enabled ?? true,
            row?.Severity ?? baseline.Severity, row?.Message ?? baseline.Message,
            row?.UpdatedBy ?? "", row?.UpdatedAt);
    }

    private static void RequireAdmin()
    {
        if (TenantContext.Get()?.Role?.Value != "Platform.Admin")
            throw new ApiException(ErrorCode.Forbidden, "Platform admin access is required.");
    }
}
