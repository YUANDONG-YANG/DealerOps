package com.dealerops.core.lead;

/** NEW → CONTACTED → QUALIFIED → WON, or LOST from any open stage. WON and LOST are final. */
public enum LeadStage {
  NEW,
  CONTACTED,
  QUALIFIED,
  WON,
  LOST;

  public boolean isClosed() {
    return this == WON || this == LOST;
  }
}
