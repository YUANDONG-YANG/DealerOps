package com.dealerops.core.compliance;

import com.dealerops.core.compliance.dto.OmvicResult;
import com.dealerops.core.compliance.dto.RuleFinding;
import com.dealerops.core.dealer.DealerEntity;
import com.dealerops.core.listing.AdKind;
import com.dealerops.core.listing.AdMedium;
import com.dealerops.core.listing.ListingEntity;
import com.dealerops.core.vehicle.ConditionCode;
import com.dealerops.core.vehicle.VehicleEntity;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Fixed OMVIC checklist from design 15 section 6. Hard misses skip AI.
 */
@Component
public class OmvicRuleEngine {

  private static final Pattern PRICE =
      Pattern.compile(
          "(?:cad|c\\$|\\$)\\s*\\d[\\d,]*(?:\\.\\d{2})?|\\d[\\d,]*(?:\\.\\d{2})?\\s*(?:cad|dollars?)",
          Pattern.CASE_INSENSITIVE);
  private static final Pattern PHONE = Pattern.compile("\\d{3}[-.\\s]?\\d{3}[-.\\s]?\\d{4}");
  private static final Pattern EMAIL = Pattern.compile("\\S+@\\S+\\.\\S+");
  private static final Pattern APR =
      Pattern.compile(
          "\\d+(\\.\\d+)?\\s*%\\s*(apr|annual percentage rate)|apr\\s*[:=]?\\s*\\d+(\\.\\d+)?\\s*%",
          Pattern.CASE_INSENSITIVE);
  private static final Pattern FINANCE_TERM =
      Pattern.compile("\\d+\\s*(month|months|mo)\\b|term\\s*[:=]?\\s*\\d+", Pattern.CASE_INSENSITIVE);
  private static final Pattern LEASE_TERM = Pattern.compile("\\d+\\s*(month|months|mo)\\b", Pattern.CASE_INSENSITIVE);
  private static final Pattern LEASE_RENT =
      Pattern.compile("\\$?\\d+.*(per month|/mo|monthly)", Pattern.CASE_INSENSITIVE);
  private static final Pattern LEASE_DOWN =
      Pattern.compile("down payment|due at signing|\\$\\d+.down", Pattern.CASE_INSENSITIVE);
  private static final Pattern KM_ALLOWANCE =
      Pattern.compile("(\\d{1,5})\\s*(km|kilometr).*/\\s*(year|yr|annual)", Pattern.CASE_INSENSITIVE);
  private static final Pattern EXCESS_KM =
      Pattern.compile("excess|overage|additional.*(km|kilometr)", Pattern.CASE_INSENSITIVE);
  private static final Pattern CERTIFIED = Pattern.compile("certified|cpo|certifi");
  private static final Pattern AS_IS = Pattern.compile("as[\\s-]?is");
  private static final Pattern UNFIT = Pattern.compile("unfit|not roadworthy|not fit");
  private static final Pattern IRREP = Pattern.compile("irreparable|salvage|write[\\s-]?off");
  private static final Pattern PRIOR_USE_CUE =
      Pattern.compile("police|taxi|daily rental|lease return|rental car");
  private static final Pattern PRIOR_USE_DISCLOSURE =
      Pattern.compile("prior use|previously used as|ex-police|former taxi|disclosed");
  private static final Pattern WARRANTY =
      Pattern.compile("extended warranty|warranty included|free warranty");

  public OmvicResult run(ListingEntity listing, VehicleEntity vehicle, DealerEntity dealer) {
    List<RuleFinding> hard = new ArrayList<>();
    List<RuleFinding> soft = new ArrayList<>();
    String title = listing.getTitle() == null ? "" : listing.getTitle();
    String body = listing.getBody() == null ? "" : listing.getBody();
    String text = title + "\n" + body;
    String textNorm = text.toLowerCase(Locale.ROOT);

    if (title.isBlank() && body.isBlank()) {
      hard.add(block("PRICE_MISSING", "Asking price is missing."));
      hard.add(block("DEALER_NAME_MISSING", "Dealership name is missing."));
      hard.add(block("CONDITION_UNDISCLOSED", "Condition is not disclosed."));
      return blocked(hard);
    }

    if (!PRICE.matcher(text).find()) {
      hard.add(block("PRICE_MISSING", "Asking price is missing."));
    }

    if (dealer == null || !containsNormalized(text, dealer.getLegalName())) {
      hard.add(block("DEALER_NAME_MISSING", "Dealership name is missing."));
    }
    boolean hasPhone =
        (dealer != null && containsNormalized(text, digits(dealer.getContactPhone())))
            || PHONE.matcher(text).find();
    boolean hasEmail =
        (dealer != null && containsNormalized(text, dealer.getContactEmail())) || EMAIL.matcher(text).find();
    boolean hasAddr = dealer != null && containsNormalized(text, dealer.getContactAddress());
    if (!(hasPhone && hasEmail && hasAddr)) {
      if (!(hasPhone || hasEmail || hasAddr)) {
        hard.add(block("DEALER_CONTACT_MISSING", "Dealership contact is missing."));
      } else {
        soft.add(review("DEALER_CONTACT_INCOMPLETE", "Dealership contact is incomplete."));
      }
    }

    if (vehicle != null && !text.contains(String.valueOf(vehicle.getModelYear()))) {
      soft.add(review("YEAR_NOT_IN_COPY", "Model year is not in the ad copy."));
    }
    if (vehicle != null
        && vehicle.getModelYear() <= Year.now().getValue() - 2
        && textNorm.matches(".*\\b(brand new|brand-new|new car)\\b.*")) {
      soft.add(review("YEAR_NOT_IN_COPY", "Copy claims new while the structured year is older."));
    }

    if (vehicle != null) {
      ConditionCode code = vehicle.getConditionCode();
      boolean claimedCertified = CERTIFIED.matcher(textNorm).find();
      boolean claimedAsIs = AS_IS.matcher(textNorm).find();
      boolean claimedUnfit = UNFIT.matcher(textNorm).find();
      boolean claimedIrrep = IRREP.matcher(textNorm).find();
      if (claimedCertified && code != ConditionCode.CERTIFIED) {
        hard.add(block("CONDITION_MISMATCH", "Ad claims certified but the vehicle is not."));
      }
      if (code == ConditionCode.UNFIT || code == ConditionCode.IRREPARABLE) {
        boolean disclosed =
            (code == ConditionCode.UNFIT && claimedUnfit)
                || (code == ConditionCode.IRREPARABLE && claimedIrrep);
        if (!disclosed) {
          hard.add(block("CONDITION_UNDISCLOSED", "Unfit or irreparable condition must be stated."));
        }
      }
      if (code == ConditionCode.AS_IS && !claimedAsIs) {
        hard.add(block("CONDITION_UNDISCLOSED", "AS_IS condition must be disclosed."));
      }
      if (code == ConditionCode.CERTIFIED && !claimedCertified) {
        soft.add(review("CERTIFIED_NOT_IN_COPY", "Certified wording is not in the copy."));
      }
    }

    if (PRIOR_USE_CUE.matcher(textNorm).find() && !PRIOR_USE_DISCLOSURE.matcher(textNorm).find()) {
      soft.add(review("PRIOR_USE_UNCLEAR", "Prior use is mentioned without a disclosure phrase."));
    }
    if (WARRANTY.matcher(textNorm).find()) {
      soft.add(review("WARRANTY_CLAIM_NEEDS_REVIEW", "Warranty claim needs review."));
    }

    AdKind kind = listing.getAdKind();
    if (kind == AdKind.FINANCE) {
      if (!APR.matcher(text).find()) {
        hard.add(block("FINANCE_APR_MISSING", "Finance APR is missing."));
      }
      if (!FINANCE_TERM.matcher(textNorm).find()) {
        soft.add(review("FINANCE_TERM_MISSING", "Finance term is missing."));
      }
      if (listing.getMedium() != AdMedium.RADIO_TV_BILLBOARD) {
        soft.add(review("FINANCE_APR_PROXIMITY", "APR proximity cannot be verified by rules."));
      }
    }

    if (kind == AdKind.LEASE) {
      if (!APR.matcher(text).find()) {
        hard.add(block("LEASE_APR_MISSING", "Lease APR is missing."));
      }
      if (!textNorm.matches(".*\\b(lease|leasing|lessee)\\b.*")) {
        hard.add(block("LEASE_STATEMENT_MISSING", "Lease statement is missing."));
      }
      if (!LEASE_TERM.matcher(textNorm).find()) {
        soft.add(review("LEASE_TERM_MISSING", "Lease term is missing."));
      }
      boolean hasRent = PRICE.matcher(text).find() || LEASE_RENT.matcher(textNorm).find();
      if (!hasRent) {
        soft.add(review("LEASE_RENT_MISSING", "Lease rent is missing."));
      }
      if (!LEASE_DOWN.matcher(textNorm).find()) {
        soft.add(review("LEASE_DOWN_MISSING", "Lease down payment is missing."));
      }
      Matcher allowance = KM_ALLOWANCE.matcher(textNorm);
      if (allowance.find()) {
        int km = Integer.parseInt(allowance.group(1));
        if (km < 20000 && !EXCESS_KM.matcher(textNorm).find()) {
          hard.add(block("LEASE_EXCESS_KM_MISSING", "Excess kilometre fee is missing."));
        }
      } else {
        soft.add(review("LEASE_ALLOWANCE_UNSTATED", "Annual kilometre allowance is unstated."));
      }
    }

    List<RuleFinding> findings = new ArrayList<>(hard);
    findings.addAll(soft);
    if (!hard.isEmpty()) {
      return blocked(findings);
    }
    return new OmvicResult(List.copyOf(findings), false);
  }

  private static OmvicResult blocked(List<RuleFinding> findings) {
    return new OmvicResult(List.copyOf(findings), true);
  }

  private static RuleFinding block(String ruleId, String message) {
    return new RuleFinding(ruleId, "BLOCK", false, message);
  }

  private static RuleFinding review(String ruleId, String message) {
    return new RuleFinding(ruleId, "REVIEW", false, message);
  }

  private static boolean containsNormalized(String text, String needle) {
    if (text == null || needle == null || needle.isBlank()) {
      return false;
    }
    return text.toLowerCase(Locale.ROOT).contains(needle.toLowerCase(Locale.ROOT));
  }

  private static String digits(String raw) {
    if (raw == null) {
      return "";
    }
    return raw.replaceAll("\\D", "");
  }
}
