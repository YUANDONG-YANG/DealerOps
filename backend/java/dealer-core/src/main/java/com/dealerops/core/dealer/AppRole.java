package com.dealerops.core.dealer;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum AppRole {
  PLATFORM_ADMIN("Platform.Admin"),
  DEALER_USER("Dealer.User");

  private final String value;

  AppRole(String value) {
    this.value = value;
  }

  @JsonValue
  public String getValue() {
    return value;
  }

  @JsonCreator
  public static AppRole fromValue(String raw) {
    if (raw == null) {
      return null;
    }
    for (AppRole role : values()) {
      if (role.value.equals(raw) || role.name().equals(raw)) {
        return role;
      }
    }
    throw new IllegalArgumentException("Unknown role");
  }
}
