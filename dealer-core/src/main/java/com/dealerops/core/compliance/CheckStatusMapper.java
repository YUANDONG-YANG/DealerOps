package com.dealerops.core.compliance;

import com.dealerops.core.listing.ListingEntity;
import org.springframework.stereotype.Component;

@Component
public class CheckStatusMapper {

  public static String derive(ListingEntity listing, ComplianceCheckEntity lastCheck) {
    if (lastCheck == null) {
      return "NEEDS_AI";
    }
    if (listing == null || lastCheck.getContentVersion() != listing.getContentVersion()) {
      if (lastCheck.getRecommendation() == Recommendation.PASSED) {
        return "STALE";
      }
      return "NEEDS_AI";
    }
    if (lastCheck.getRecommendation() == Recommendation.BLOCKED) {
      return "BLOCKED";
    }
    if (lastCheck.getRecommendation() == Recommendation.PASSED) {
      return "PASSED";
    }
    if (lastCheck.getRecommendation() == Recommendation.UNAVAILABLE) {
      return "AI_UNAVAILABLE";
    }
    return "NEEDS_AI";
  }
}
