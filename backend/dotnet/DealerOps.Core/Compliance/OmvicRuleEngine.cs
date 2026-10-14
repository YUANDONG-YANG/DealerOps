using System.Text.RegularExpressions;
using DealerOps.Core.Compliance.Dto;
using DealerOps.Core.Dealer;
using DealerOps.Core.Listing;
using DealerOps.Core.Vehicle;

namespace DealerOps.Core.Compliance;

public class OmvicRuleEngine
{
    private static readonly Regex Price = new(
        @"(?:cad|c\$|\$)\s*\d[\d,]*(?:\.\d{2})?|\d[\d,]*(?:\.\d{2})?\s*(?:cad|dollars?)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex Phone = new(@"\d{3}[-.\s]?\d{3}[-.\s]?\d{4}", RegexOptions.Compiled);
    private static readonly Regex Email = new(@"\S+@\S+\.\S+", RegexOptions.Compiled);
    private static readonly Regex Apr = new(
        @"\d+(?:\.\d+)?\s*%\s*(?:apr|annual percentage rate)|apr\s*[:=]?\s*\d+(?:\.\d+)?\s*%",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex TermMo = new(
        @"\d+\s*(?:month|months|mo)\b|term\s*[:=]?\s*\d+",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LeaseWord = new(@"\b(?:lease|leasing|lessee)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LeaseRent = new(
        @"\$?\d[\d,]*(?:\.\d{2})?\s*(?:per month|/mo|monthly)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LeaseDown = new(
        @"down payment|due at signing|\$\d[\d,]*.{0,12}down",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LeaseKmAllowance = new(
        @"(?<![\d,.])(\d{1,3}(?:[, ]\d{3})+|\d{1,6})\s*(?:km|kilomet(?:er|re)s?)\s*(?:per|/)?\s*(?:year|yr|annual)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LeaseExcess = new(
        @"excess|overage|additional.{0,20}(?:km|kilomet)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LeaseTermOnly = new(
        @"\d+\s*(month|months|mo)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CertifiedRx = new(@"certified|cpo|certifi",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex AsIsRx = new(@"\bas[\s-]?is\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex UnfitRx = new(@"unfit|not roadworthy|not fit",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex IrrepRx = new(@"irreparable|salvage|write[\s-]?off",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex BrandNew = new(
        @"\b(?:brand[\s-]?new|never used|0\s*km|zero kilometres|new car(?!\s+feel))\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex PriorUseCue = new(
        @"police|taxi|cab\b|limo(?:usine)?|uber|lyft|rideshare|daily rental|rental (?:car|fleet)|car[- ]share|lease return|ex[- ]lease|former lease|repo(?:ssessed)?|ambulance|driver[- ]ed",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex PriorUseDisclosure = new(
        @"(?:previously used as|prior use|former(?:ly)? (?:a )?(?:police|taxi|limo(?:usine)?|rental)|ex[- ](?:police|taxi|limo(?:usine)?|rental)|lease return disclosed|disclosed prior use)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex WarrantyBoast = new(
        @"extended warranty|warranty included|free warranty",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex Payment = new(
        @"\$?\d[\d,]*(?:\.\d{2})?\s*(?:per month|/mo|monthly|bi-?weekly|per week|/wk)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public OmvicResult Run(ListingEntity listing, VehicleEntity vehicle, DealerEntity dealer)
    {
        var hard = new List<RuleFinding>();
        var soft = new List<RuleFinding>();

        if (IsBlank(listing.Title) && IsBlank(listing.Body))
        {
            hard.Add(Hard("PRICE_MISSING", "Advertised price not found in the ad body."));
            hard.Add(Hard("DEALER_NAME_MISSING", "Dealership legal name is missing from the ad."));
            hard.Add(Hard("CONDITION_UNDISCLOSED", "Vehicle condition is not disclosed in the ad."));
            return new OmvicResult(hard, true);
        }

        var text = (listing.Title ?? "") + "\n" + (listing.Body ?? "");

        if (!Price.IsMatch(text))
            hard.Add(Hard("PRICE_MISSING", "Advertised price not found in the ad body."));

        if (!ContainsNormalized(text, dealer.LegalName))
            hard.Add(Hard("DEALER_NAME_MISSING", "Dealership legal name is missing from the ad."));

        bool hasPhone = ContainsNormalized(text, Digits(dealer.ContactPhone)) || Phone.IsMatch(text);
        bool hasEmail = ContainsNormalized(text, dealer.ContactEmail) || Email.IsMatch(text);
        bool hasAddr = ContainsNormalized(text, dealer.ContactAddress);

        if (!(hasPhone && hasEmail && hasAddr))
        {
            if (!(hasPhone || hasEmail || hasAddr))
                hard.Add(Hard("DEALER_CONTACT_MISSING", "Dealership contact details are missing from the ad."));
            else
                soft.Add(Soft("DEALER_CONTACT_INCOMPLETE", "Dealership contact details look incomplete."));
        }

        if (!text.Contains(vehicle.ModelYear.ToString()))
            soft.Add(Soft("YEAR_NOT_IN_COPY", "Model year is not present in the ad copy."));

        if (BrandNew.IsMatch(text) && vehicle.ModelYear <= DateTime.UtcNow.Year - 2)
            soft.Add(Soft("YEAR_NEW_USED_CONTRADICTION", "Copy implies new while the model year is older."));

        bool claimedCertified = CertifiedRx.IsMatch(text);
        bool claimedAsIs = AsIsRx.IsMatch(text);
        bool claimedUnfit = UnfitRx.IsMatch(text);
        bool claimedIrrep = IrrepRx.IsMatch(text);
        var code = vehicle.ConditionCode;

        if (claimedCertified && code != ConditionCode.Certified)
            hard.Add(Hard("CONDITION_MISMATCH", "Ad claims certified but the vehicle is not certified."));
        if (code == ConditionCode.Unfit && !claimedUnfit)
            hard.Add(Hard("CONDITION_UNDISCLOSED", "Unfit condition is not disclosed."));
        if (code == ConditionCode.Irreparable && !claimedIrrep)
            hard.Add(Hard("CONDITION_UNDISCLOSED", "Irreparable condition is not disclosed."));
        if (code == ConditionCode.AsIs && !claimedAsIs)
            hard.Add(Hard("CONDITION_UNDISCLOSED", "As-is condition is not disclosed."));
        if (code == ConditionCode.Certified && !claimedCertified)
            soft.Add(Soft("CERTIFIED_NOT_IN_COPY", "Certified status is not stated in the copy."));

        if (PriorUseCue.IsMatch(text) && !PriorUseDisclosure.IsMatch(text))
            soft.Add(Soft("PRIOR_USE_UNCLEAR", "Prior use is mentioned without a clear disclosure."));
        if (WarrantyBoast.IsMatch(text))
            soft.Add(Soft("WARRANTY_CLAIM_NEEDS_REVIEW", "Warranty claim needs review."));

        bool showsRateOrPayment = listing.AdKind == AdKind.Cash &&
                                  (Apr.IsMatch(text) || Payment.IsMatch(text));

        if (listing.AdKind == AdKind.Finance || showsRateOrPayment)
        {
            if (!Apr.IsMatch(text))
                hard.Add(Hard("FINANCE_APR_MISSING", "Finance APR is missing from the ad."));
            if (!TermMo.IsMatch(text))
                soft.Add(Soft("FINANCE_TERM_MISSING", "Finance term is not stated."));
            if (listing.Medium != AdMedium.RadioTvBillboard)
                soft.Add(Soft("FINANCE_APR_PROXIMITY", "Finance APR placement should be reviewed."));
        }

        if (listing.AdKind == AdKind.Lease)
        {
            if (!Apr.IsMatch(text))
                hard.Add(Hard("LEASE_APR_MISSING", "Lease APR is missing from the ad."));
            if (!LeaseWord.IsMatch(text))
                hard.Add(Hard("LEASE_STATEMENT_MISSING", "Lease statement is missing from the ad."));
            if (!LeaseTermOnly.IsMatch(text))
                soft.Add(Soft("LEASE_TERM_MISSING", "Lease term is not stated."));
            if (!Price.IsMatch(text) && !LeaseRent.IsMatch(text))
                soft.Add(Soft("LEASE_RENT_MISSING", "Lease rent is not stated."));
            if (!LeaseDown.IsMatch(text))
                soft.Add(Soft("LEASE_DOWN_MISSING", "Lease down payment is not stated."));

            var kmMatch = LeaseKmAllowance.Match(text);
            if (kmMatch.Success)
            {
                var km = int.Parse(kmMatch.Groups[1].Value.Replace(",", "").Replace(" ", ""));
                if (km < 20000 && !LeaseExcess.IsMatch(text))
                    hard.Add(Hard("LEASE_EXCESS_KM_MISSING", "Excess kilometre fees are missing."));
            }
            else
            {
                soft.Add(Soft("LEASE_ALLOWANCE_UNSTATED", "Annual kilometre allowance is not stated."));
            }
        }

        var findings = new List<RuleFinding>(hard);
        findings.AddRange(soft);
        return new OmvicResult(findings, hard.Count > 0);
    }

    private static bool IsBlank(string? s) => string.IsNullOrWhiteSpace(s);
    private static string Digits(string? s) => s == null ? "" : Regex.Replace(s, @"\D", "");

    private static bool ContainsNormalized(string haystack, string? needle)
    {
        if (IsBlank(needle)) return false;
        var h = Regex.Replace(haystack.ToLowerInvariant(), @"\s+", " ");
        var n = Regex.Replace(needle!.ToLowerInvariant(), @"\s+", " ");
        return h.Contains(n);
    }

    private static RuleFinding Hard(string ruleId, string message) => new(ruleId, "BLOCK", false, message);
    private static RuleFinding Soft(string ruleId, string message) => new(ruleId, "REVIEW", false, message);
}
