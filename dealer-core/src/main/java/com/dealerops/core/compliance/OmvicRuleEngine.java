package com.dealerops.core.compliance;

import com.dealerops.core.compliance.dto.RuleFinding;
import com.dealerops.core.dealer.DealerEntity;
import com.dealerops.core.listing.AdKind;
import com.dealerops.core.listing.AdMedium;
import com.dealerops.core.listing.ListingEntity;
import com.dealerops.core.vehicle.ConditionCode;
import com.dealerops.core.vehicle.VehicleEntity;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.OptionalInt;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class OmvicRuleEngine {

  static final Pattern PRICE =
      Pattern.compile(
          "(?:cad|c\\$|\\$)\\s*\\d[\\d,]*(?:\\.\\d{2})?|\\d[\\d,]*(?:\\.\\d{2})?\\s*(?:cad|dollars?)",
          Pattern.CASE_INSENSITIVE);
  static final Pattern PHONE = Pattern.compile("\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{4}");
  static final Pattern EMAIL = Pattern.compile("\\S+@\\S+\\.\\S+");
  static final Pattern APR =
      Pattern.compile(
          "\\d+(?:\\.\\d+)?\\s*%\\s*(?:apr|annual percentage rate)|apr\\s*[:=]?\\s*\\d+(?:\\.\\d+)?\\s*%",
          Pattern.CASE_INSENSITIVE);
  static final Pattern TERM_MO =
      Pattern.compile("\\d+\\s*(?:month|months|mo)\\b|term\\s*[:=]?\\s*\\d+", Pattern.CASE_INSENSITIVE);
  static final Pattern LEASE_WORD = Pattern.compile("\\b(?:lease|leasing|lessee)\\b", Pattern.CASE_INSENSITIVE);
  static final Pattern LEASE_RENT =
      Pattern.compile("\\$?\\d[\\d,]*(?:\\.\\d{2})?\\s*(?:per month|/mo|monthly)", Pattern.CASE_INSENSITIVE);
  static final Pattern LEASE_DOWN =
      Pattern.compile("down payment|due at signing|\\$\\d[\\d,]*.{0,12}down", Pattern.CASE_INSENSITIVE);
  static final Pattern LEASE_KM_ALLOWANCE =
      Pattern.compile(
          "(\\d{1,2}[, ]?\\d{3}|\\d{1,5})\\s*(?:km|kilomet(?:er|re)s?)\\s*(?:per|/)?\\s*(?:year|yr|annual)",
          Pattern.CASE_INSENSITIVE);
  static final Pattern LEASE_EXCESS =
      Pattern.compile("excess|overage|additional.{0,20}(?:km|kilomet)", Pattern.CASE_INSENSITIVE);
  static final Pattern CERTIFIED = Pattern.compile("certified|cpo|certifi", Pattern.CASE_INSENSITIVE);
  static final Pattern AS_IS = Pattern.compile("as[\\s-]?is", Pattern.CASE_INSENSITIVE);
  static final Pattern UNFIT = Pattern.compile("unfit|not roadworthy|not fit", Pattern.CASE_INSENSITIVE);
  static final Pattern IRREP = Pattern.compile("irreparable|salvage|write[\\s-]?off", Pattern.CASE_INSENSITIVE);
  static final Pattern BRAND_NEW =
      Pattern.compile(
          "\\b(?:brand[\\s-]?new|never used|0\\s*km|zero kilometres|new car(?!\\s+feel))\\b",
          Pattern.CASE_INSENSITIVE);
  static final Pattern PRIOR_USE_CUE =
      Pattern.compile(
          "police|taxi|cab\\b|limo(?:usine)?|uber|lyft|rideshare|daily rental|rental (?:car|fleet)|car[- ]share|"
              + "lease return|ex[- ]lease|former lease|repo(?:ssessed)?|ambulance|driver[- ]ed",
          Pattern.CASE_INSENSITIVE);
  static final Pattern PRIOR_USE_DISCLOSURE =
      Pattern.compile(
          "(?:previously used as|prior use|former(?:ly)? (?:a )?(?:police|taxi|limo(?:usine)?|rental)|"
              + "ex[- ](?:police|taxi|limo(?:usine)?|rental)|lease return disclosed|disclosed prior use)",
          Pattern.CASE_INSENSITIVE);
  static final Pattern WARRANTY_BOAST =
      Pattern.compile("extended warranty|warranty included|free warranty", Pattern.CASE_INSENSITIVE);
  static final Pattern LEASE_TERM_ONLY =
      Pattern.compile("\\d+\\s*(month|months|mo)\\b", Pattern.CASE_INSENSITIVE);

  public OmvicResult run(ListingEntity listing, VehicleEntity vehicle, DealerEntity dealer) {
    List<RuleFinding> hard = new ArrayList<>();
    List<RuleFinding> soft = new ArrayList<>();
    if (blank(listing.getTitle()) && blank(listing.getBody())) {
      hard.add(hardFinding("PRICE_MISSING", "Advertised price not found in the ad body."));
      hard.add(hardFinding("DEALER_NAME_MISSING", "Dealership legal name is missing from the ad."));
      hard.add(hardFinding("CONDITION_UNDISCLOSED", "Vehicle condition is not disclosed in the ad."));
      return new OmvicResult(hard, true);
    }

    String text = listing.getTitle() + "\n" + listing.getBody();
    if (!PRICE.matcher(text).find()) {
      hard.add(hardFinding("PRICE_MISSING", "Advertised price not found in the ad body."));
    }
    if (!containsNormalized(text, dealer.getLegalName())) {
      hard.add(hardFinding("DEALER_NAME_MISSING", "Dealership legal name is missing from the ad."));
    }

    boolean hasPhone =
        containsNormalized(text, digits(dealer.getContactPhone())) || PHONE.matcher(text).find();
    boolean hasEmail = containsNormalized(text, dealer.getContactEmail()) || EMAIL.matcher(text).find();
    boolean hasAddr = containsNormalized(text, dealer.getContactAddress());
    if (!(hasPhone && hasEmail && hasAddr)) {
      if (!(hasPhone || hasEmail || hasAddr)) {
        hard.add(hardFinding("DEALER_CONTACT_MISSING", "Dealership contact details are missing from the ad."));
      } else {
        soft.add(softFinding("DEALER_CONTACT_INCOMPLETE", "Dealership contact details look incomplete."));
      }
    }

    if (!text.contains(String.valueOf(vehicle.getModelYear()))) {
      soft.add(softFinding("YEAR_NOT_IN_COPY", "Model year is not present in the ad copy."));
    }
    int calendarYear = Year.now(ZoneOffset.UTC).getValue();
    if (BRAND_NEW.matcher(text).find() && vehicle.getModelYear() <= calendarYear - 2) {
      soft.add(softFinding("YEAR_NEW_USED_CONTRADICTION", "Copy implies new while the model year is older."));
    }

    boolean claimedCertified = CERTIFIED.matcher(text).find();
    boolean claimedAsIs = AS_IS.matcher(text).find();
    boolean claimedUnfit = UNFIT.matcher(text).find();
    boolean claimedIrrep = IRREP.matcher(text).find();
    ConditionCode code = vehicle.getConditionCode();
    if (claimedCertified && code != ConditionCode.CERTIFIED) {
      hard.add(hardFinding("CONDITION_MISMATCH", "Ad claims certified but the vehicle is not certified."));
    }
    if (code == ConditionCode.UNFIT && !claimedUnfit) {
      hard.add(hardFinding("CONDITION_UNDISCLOSED", "Unfit condition is not disclosed."));
    }
    if (code == ConditionCode.IRREPARABLE && !claimedIrrep) {
      hard.add(hardFinding("CONDITION_UNDISCLOSED", "Irreparable condition is not disclosed."));
    }
    if (code == ConditionCode.AS_IS && !claimedAsIs) {
      hard.add(hardFinding("CONDITION_UNDISCLOSED", "As-is condition is not disclosed."));
    }
    if (code == ConditionCode.CERTIFIED && !claimedCertified) {
      soft.add(softFinding("CERTIFIED_NOT_IN_COPY", "Certified status is not stated in the copy."));
    }

    if (mentionsPriorUseCue(text) && !mentionsPriorUseDisclosure(text)) {
      soft.add(softFinding("PRIOR_USE_UNCLEAR", "Prior use is mentioned without a clear disclosure."));
    }
    if (WARRANTY_BOAST.matcher(text).find()) {
      soft.add(softFinding("WARRANTY_CLAIM_NEEDS_REVIEW", "Warranty claim needs review."));
    }

    if (listing.getAdKind() == AdKind.FINANCE) {
      if (!APR.matcher(text).find()) {
        hard.add(hardFinding("FINANCE_APR_MISSING", "Finance APR is missing from the ad."));
      }
      if (!TERM_MO.matcher(text).find()) {
        soft.add(softFinding("FINANCE_TERM_MISSING", "Finance term is not stated."));
      }
      if (listing.getMedium() != AdMedium.RADIO_TV_BILLBOARD) {
        soft.add(softFinding("FINANCE_APR_PROXIMITY", "Finance APR placement should be reviewed."));
      }
    }

    if (listing.getAdKind() == AdKind.LEASE) {
      if (!APR.matcher(text).find()) {
        hard.add(hardFinding("LEASE_APR_MISSING", "Lease APR is missing from the ad."));
      }
      if (!LEASE_WORD.matcher(text).find()) {
        hard.add(hardFinding("LEASE_STATEMENT_MISSING", "Lease statement is missing from the ad."));
      }
      if (!LEASE_TERM_ONLY.matcher(text).find()) {
        soft.add(softFinding("LEASE_TERM_MISSING", "Lease term is not stated."));
      }
      if (!PRICE.matcher(text).find() && !LEASE_RENT.matcher(text).find()) {
        soft.add(softFinding("LEASE_RENT_MISSING", "Lease rent is not stated."));
      }
      if (!LEASE_DOWN.matcher(text).find()) {
        soft.add(softFinding("LEASE_DOWN_MISSING", "Lease down payment is not stated."));
      }
      OptionalInt km = capturedKm(text);
      if (km.isPresent()) {
        if (km.getAsInt() < 20000 && !LEASE_EXCESS.matcher(text).find()) {
          hard.add(hardFinding("LEASE_EXCESS_KM_MISSING", "Excess kilometre fees are missing."));
        }
      } else {
        soft.add(softFinding("LEASE_ALLOWANCE_UNSTATED", "Annual kilometre allowance is not stated."));
      }
    }

    List<RuleFinding> findings = new ArrayList<>(hard);
    findings.addAll(soft);
    return new OmvicResult(List.copyOf(findings), !hard.isEmpty());
  }

  static boolean blank(String s) {
    return s == null || s.trim().isEmpty();
  }

  static String digits(String s) {
    return s == null ? "" : s.replaceAll("\\D", "");
  }

  static boolean containsNormalized(String haystack, String needle) {
    if (blank(needle)) {
      return false;
    }
    String h = haystack.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    String n = needle.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    return h.contains(n);
  }

  static boolean mentionsPriorUseCue(String text) {
    return PRIOR_USE_CUE.matcher(text).find();
  }

  static boolean mentionsPriorUseDisclosure(String text) {
    return PRIOR_USE_DISCLOSURE.matcher(text).find();
  }

  static OptionalInt capturedKm(String text) {
    Matcher m = LEASE_KM_ALLOWANCE.matcher(text);
    if (!m.find()) {
      return OptionalInt.empty();
    }
    return OptionalInt.of(Integer.parseInt(m.group(1).replaceAll("[, ]", "")));
  }

  private static RuleFinding hardFinding(String ruleId, String message) {
    return new RuleFinding(ruleId, "BLOCK", false, message);
  }

  private static RuleFinding softFinding(String ruleId, String message) {
    return new RuleFinding(ruleId, "REVIEW", false, message);
  }
}
