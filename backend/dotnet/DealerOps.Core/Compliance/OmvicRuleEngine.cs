using System.Text.RegularExpressions;
using DealerOps.Core.Compliance.Dto;
using DealerOps.Core.Dealer;
using DealerOps.Core.Listing;
using DealerOps.Core.Vehicle;

namespace DealerOps.Core.Compliance;

/// <summary>Deterministic OMVIC advertising rules run on a listing before the AI ad check.</summary>
public class OmvicRuleEngine
{
    private static readonly Regex Price = new(
        @"(?:cad|c\$|\$)\s*\d[\d,]*(?:\.\d{2})?|\d[\d,]*(?:\.\d{2})?\s*(?:cad|dollars?)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex PhoneLike = new(@"\+?\d[\d\s().-]{5,}\d", RegexOptions.Compiled);
    private static readonly Regex Apr = new(
        @"\d+(?:\.\d+)?\s*%\s*(?:apr|annual percentage rate)|apr\s*[:=]?\s*\d+(?:\.\d+)?\s*%",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    // Any interest rate shown, labelled APR or not ("0% financing", "rates from 2.9%"):
    // it makes a cash ad a financing ad (AD-04).
    private static readonly Regex Rate = new(
        @"\d+(?:\.\d+)?\s*%\s*(?:apr|annual percentage rate|financing|interest|rate)|(?:apr|financing|interest|rates?)\b[^.\n%]{0,20}?\d+(?:\.\d+)?\s*%",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    // "12 month warranty" is a warranty, not a finance term; "5-year" counts, "5 years old" does not.
    private static readonly Regex TermMo = new(
        @"\d+[\s-]*(?:month|months|mo)\b(?![\s-]*warrant)|term\s*[:=]?\s*\d+|\b\d{1,2}[\s-]*(?:year|yr)s?\b(?![\s-]*(?:old|warrant))",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LeaseWord = new(@"\b(?:lease|leasing|lessee)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    // The upfront amount itself must be stated: "$2,000 down", "down payment of $2,000", or an
    // explicit "$0 / zero / no money down". The bare phrase "down payment" is not enough.
    private static readonly Regex LeaseDown = new(
        @"\$\s*\d[\d,]*(?:\.\d{2})?[^.\n]{0,20}?\b(?:down|due at signing|at signing|due on delivery)\b|(?:down payment|due at signing|due on delivery)[^.\n$]{0,15}\$\s*\d|\b(?:zero|no money|nothing)\s+(?:down|due at signing)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LeaseKmAllowance = new(
        @"(?<![\d,.])(?<km>\d{1,3}(?:[, ]\d{3})+|\d{1,6})\s*(?:km|kilomet(?:er|re)s?)\s*(?:(?:per|/|a|each)\s*)?(?:year|yr|annum|annual(?:ly)?)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LeaseKmAllowanceAnnualFirst = new(
        @"annual(?:ly)?[^.\n]{0,30}?(?<![\d,.])(?<km>\d{1,3}(?:[, ]\d{3})+|\d{1,6})\s*(?:km|kilomet(?:er|re)s?)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    // The excess-km charge must be a per-km cost such as "$0.12/km" or "12 cents per extra km";
    // the word "excess" alone does not disclose it.
    private static readonly Regex LeaseExcess = new(
        @"(?:\$\s*\d*\.?\d+|\d+(?:\.\d+)?\s*(?:¢|cents?))\s*(?:/|per|a|each)\s*(?:excess\s+|additional\s+|extra\s+)?(?:km|kilomet)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex LeaseTermOnly = new(
        @"\d+[\s-]*(month|months|mo)\b|\b\d{1,2}[\s-]*(?:year|yr)s?\b(?![\s-]*(?:old|warrant))",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CertifiedRx = new(@"\b(?:certified|cpo)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    // "not certified" / "non-certified" denies the claim rather than making it.
    private static readonly Regex CertifiedDenial = new(@"\b(?:not|never|non)[\s-]*certified\b",
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
        // Whole words only, so "report" is not "repo" and "tuber" is not "uber"; pickup cab
        // styles such as "Crew Cab" describe the body, not taxi use.
        @"\b(?:police|taxi|(?<!(?:crew|king|double|quad|super|mega|extended|access|regular) )cab|limo(?:usine)?|uber|lyft|rideshare|daily rental|daily lease|emergency(?![\s-]*(?:brak|assist|kit|roadside|stop|light|flasher|call))|rental (?:car|fleet)|car[- ]share|lease return|ex[- ]lease|former lease|repo(?:ssessed)?|ambulance|driver[- ]ed)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex PriorUseDisclosure = new(
        @"(?:previously used as|prior use|former(?:ly)? (?:a |an )?(?:police|emergency|taxi|limo(?:usine)?|rental|daily lease)|ex[- ](?:police|emergency|taxi|limo(?:usine)?|rental)|lease return disclosed|disclosed prior use)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex WarrantyBoast = new(
        @"\bwarrant(?:y|ies)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    // Shared payment cadence: "/mo" and "/month" both occur in real copy, so the month
    // suffix is optional; without it "$299/month" reads as a cash price.
    // A payment named before its amount: "monthly payment of", "bi-weekly payments from".
    private const string PaymentLeadText =
        @"(?:monthly|bi-?weekly|weekly)\s+payments?\s*(?:of|from|:)?\s*";
    private const string Cadence =
        @"(?:per\s+month|a\s+month|/\s*mo(?:nth)?\b|monthly|bi-?weekly|weekly|per\s+week|/\s*wk\b)";
    // "$399 per month", or the cadence first: "monthly payment of $399".
    private static readonly Regex Payment = new(
        @"\$?\d[\d,]*(?:\.\d{2})?\s*" + Cadence + @"|" + PaymentLeadText + @"\$\s*\d[\d,]*(?:\.\d{2})?",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex UsedStatus = new(
        @"\b(?:used|pre[\s-]?owned|second[\s-]?hand|previously owned)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex CostOfBorrowing = new(
        @"cost of borrowing|total cost of credit|borrowing cost|finance charge",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    // Anchored at the start of whatever follows an amount: it turns that amount into a
    // periodic payment or an upfront amount rather than a cash price.
    private static readonly Regex PaymentCadence = new(
        @"^\s*(?:" + Cadence + @"|down\b|due at signing)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);
    // Anchored at the end of whatever precedes an amount: "down payment of $2,000" and
    // "monthly payment of $399" are not cash prices either.
    private static readonly Regex PaymentLead = new(
        @"(?:payments?|monthly|bi-?weekly|weekly)\s*(?:of|from|:)?\s*$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>Evaluates the listing text against the vehicle and dealer facts; BLOCK findings come first.</summary>
    public OmvicResult Run(ListingEntity listing, VehicleEntity vehicle, DealerEntity dealer)
    {
        var hard = new List<RuleFinding>();
        var soft = new List<RuleFinding>();

        // A blank draft needs no special case: the rules below already produce the correct
        // superset for every ad kind and medium.
        var text = (listing.Title ?? "") + "\n" + (listing.Body ?? "");

        if (!Price.IsMatch(text))
            hard.Add(Hard("PRICE_MISSING", "Advertised price not found in the ad body."));

        if (!ContainsNormalized(text, dealer.LegalName))
            hard.Add(Hard("DEALER_NAME_MISSING", "Dealership legal name is missing from the ad."));

        // The dealership's own phone and email must appear. Any other phone or email in the
        // copy does not satisfy the check (AD-06). Legal name and address stay required too.
        bool hasPhone = HasDealerPhone(text, dealer.ContactPhone);
        bool hasEmail = !string.IsNullOrWhiteSpace(dealer.ContactEmail)
            && ContainsNormalized(text, dealer.ContactEmail);
        bool hasAddr = !string.IsNullOrWhiteSpace(dealer.ContactAddress)
            && ContainsNormalized(text, dealer.ContactAddress);

        if (!(hasPhone && hasEmail && hasAddr))
        {
            if (!(hasPhone || hasEmail || hasAddr))
                hard.Add(Hard("DEALER_CONTACT_MISSING", "Dealership contact details are missing from the ad."));
            else
                soft.Add(Soft("DEALER_CONTACT_INCOMPLETE", "Dealership contact details look incomplete."));
        }

        // Digit boundaries so a price such as "$32,019" does not count as stating a 2019 model year.
        if (!Regex.IsMatch(text, $@"(?<!\d){vehicle.ModelYear}(?!\d)"))
            soft.Add(Soft("YEAR_NOT_IN_COPY", "Model year is not present in the ad copy."));

        if (BrandNew.IsMatch(text) && vehicle.ModelYear <= DateTime.UtcNow.Year - 2)
            soft.Add(Soft("YEAR_NEW_USED_CONTRADICTION", "Copy implies new while the model year is older."));

        // Strip denials first, so "not certified" is not read as a certification claim while a
        // genuine claim elsewhere in the same copy still counts.
        bool claimedCertified = CertifiedRx.IsMatch(CertifiedDenial.Replace(text, " "));
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

        // The source lists new/used as an always-required disclosure, but erratum 4 keeps the
        // new/old family advisory, so a silent ad is flagged rather than blocked.
        if (!BrandNew.IsMatch(text) && !UsedStatus.IsMatch(text))
            soft.Add(Soft("NEW_USED_NOT_STATED",
                "The ad does not state whether the vehicle is new or used."));

        var priorUseDisclosed = listing.PriorUse switch
        {
            "POLICE_EMERGENCY" => Regex.IsMatch(text, @"(?:previously|formerly|prior|ex)[\s\S]{0,30}(?:police|emergency)|(?:police|emergency)[\s\S]{0,30}(?:previously used|prior use|former)", RegexOptions.IgnoreCase),
            "TAXI_LIMO" => Regex.IsMatch(text, @"(?:previously|formerly|prior|ex)[\s\S]{0,30}(?:taxi|cab\b|limo)|(?:taxi|cab\b|limo)[\s\S]{0,30}(?:previously used|prior use|former)", RegexOptions.IgnoreCase),
            "DAILY_RENTAL" => Regex.IsMatch(text, @"(?:previously|formerly|prior|ex)[\s\S]{0,30}(?:rental|daily lease)|(?:rental|daily lease)[\s\S]{0,30}(?:previously used|prior use|former)", RegexOptions.IgnoreCase),
            "OTHER" => PriorUseDisclosure.IsMatch(text),
            _ => PriorUseDisclosure.IsMatch(text)
        };
        if (!string.IsNullOrWhiteSpace(listing.PriorUse) && !priorUseDisclosed)
            soft.Add(Soft("PRIOR_USE_UNCLEAR", "The prior use recorded in the checklist is not disclosed in the ad."));
        else if (PriorUseCue.IsMatch(text) && !priorUseDisclosed)
            soft.Add(Soft("PRIOR_USE_UNCLEAR", "Prior use is mentioned without a clear disclosure."));
        if (!string.IsNullOrWhiteSpace(listing.WarrantyTerms) && !ContainsNormalized(text, listing.WarrantyTerms))
            soft.Add(Soft("WARRANTY_TERMS_MISSING", "Extended warranty terms are recorded but are not stated in the ad."));
        if (WarrantyBoast.IsMatch(text))
            soft.Add(Soft("WARRANTY_CLAIM_NEEDS_REVIEW", "Warranty claim needs review."));

        bool showsRateOrPayment = listing.AdKind == AdKind.Cash &&
                                  (Rate.IsMatch(text) || Payment.IsMatch(text));

        if (listing.AdKind == AdKind.Finance || showsRateOrPayment)
        {
            if (!Apr.IsMatch(text))
                hard.Add(Hard("FINANCE_APR_MISSING", "Finance APR is missing from the ad."));
            if (!TermMo.IsMatch(text))
                soft.Add(Soft("FINANCE_TERM_MISSING", "Finance term is not stated."));
            // A payment amount alone satisfies the generic price rule, so finance copy is
            // checked separately for a cash price or the cost of borrowing.
            if (!HasCashPrice(text) && !CostOfBorrowing.IsMatch(text))
                hard.Add(Hard("FINANCE_CASH_PRICE_MISSING",
                    "Finance advertising must state the cash price or the cost of borrowing."));
            // "As prominently as the payment": the APR must sit next to the payment amount, not
            // in a footnote or in the other part of the ad (title vs. body).
            if (listing.Medium != AdMedium.RadioTvBillboard && Apr.IsMatch(text) && Payment.IsMatch(text)
                && !AprNextToPayment(text))
                soft.Add(Soft("FINANCE_APR_PROXIMITY",
                    "The APR is not shown next to the payment amount; it must be as prominent as the payment."));
        }

        if (listing.AdKind == AdKind.Lease)
        {
            if (!Apr.IsMatch(text))
                hard.Add(Hard("LEASE_APR_MISSING", "Lease APR is missing from the ad."));
            if (!LeaseWord.IsMatch(text))
                hard.Add(Hard("LEASE_STATEMENT_MISSING", "Lease statement is missing from the ad."));
            if (!LeaseTermOnly.IsMatch(text))
                soft.Add(Soft("LEASE_TERM_MISSING", "Lease term is not stated."));
            // Checked against the payment cadence alone. Pairing it with the price rule made
            // this unreachable: a lease ad with no amount at all is already a PRICE_MISSING
            // block, so one quoting only a cash price never had its payment amount checked.
            if (!Payment.IsMatch(text))
                soft.Add(Soft("LEASE_RENT_MISSING", "Lease payment amount is not stated."));
            if (!LeaseDown.IsMatch(text))
                soft.Add(Soft("LEASE_DOWN_MISSING", "Lease down payment is not stated."));

            var kmMatch = LeaseKmAllowance.Match(text);
            if (!kmMatch.Success) kmMatch = LeaseKmAllowanceAnnualFirst.Match(text);
            if (listing.AnnualKmAllowance is int declaredAllowance)
            {
                // The stricter of the two figures decides: an ad that prints 16,000 km/year must
                // disclose the excess-km fee even if the checklist recorded 24,000.
                var effectiveAllowance = declaredAllowance;
                if (!kmMatch.Success)
                    soft.Add(Soft("LEASE_ALLOWANCE_NOT_IN_COPY", "Recorded annual kilometre allowance is not stated in the ad."));
                else
                {
                    var copyAllowance = int.Parse(kmMatch.Groups["km"].Value.Replace(",", "").Replace(" ", ""));
                    if (copyAllowance != declaredAllowance)
                        soft.Add(Soft("LEASE_ALLOWANCE_MISMATCH", "Annual kilometre allowance in the ad differs from the salesperson checklist."));
                    effectiveAllowance = Math.Min(declaredAllowance, copyAllowance);
                }
                if (effectiveAllowance < 20000 && !LeaseExcess.IsMatch(text))
                    hard.Add(Hard("LEASE_EXCESS_KM_MISSING", "Excess kilometre fees are missing."));
            }
            else if (kmMatch.Success)
            {
                var km = int.Parse(kmMatch.Groups["km"].Value.Replace(",", "").Replace(" ", ""));
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
        return new OmvicResult(findings);
    }

    // Within this many characters of a payment amount counts as shown next to it.
    private const int AprPaymentDistance = 80;

    private static bool AprNextToPayment(string text)
    {
        var aprs = Apr.Matches(text);
        return Payment.Matches(text).Any(p => aprs.Any(a => Math.Abs(a.Index - p.Index) <= AprPaymentDistance));
    }

    // True when at least one advertised amount is not immediately qualified as a periodic
    // payment or an upfront amount, which is what distinguishes a cash price from
    // "$299 per month" or "$2,000 down".
    private static bool HasCashPrice(string text)
    {
        foreach (Match match in Price.Matches(text))
        {
            if (!PaymentCadence.IsMatch(text[(match.Index + match.Length)..])
                && !PaymentLead.IsMatch(text[..match.Index]))
                return true;
        }
        return false;
    }

    private static bool IsBlank(string? s) => string.IsNullOrWhiteSpace(s);
    private static string Digits(string? s) => s == null ? "" : Regex.Replace(s, @"\D", "");

    // Compares digits only, so "(403) 555-0100" in the copy matches a stored "+1 403-555-0100".
    // The last ten digits decide, which ignores a leading country code on either side.
    private static bool HasDealerPhone(string text, string? phone)
    {
        var wanted = LastDigits(Digits(phone));
        if (wanted.Length < 7) return false;
        return PhoneLike.Matches(text).Any(m => LastDigits(Digits(m.Value)) == wanted);
    }

    private static string LastDigits(string digits) => digits.Length > 10 ? digits[^10..] : digits;

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
