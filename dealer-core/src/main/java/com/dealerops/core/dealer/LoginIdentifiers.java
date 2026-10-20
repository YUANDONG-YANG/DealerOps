package com.dealerops.core.dealer;

import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import java.util.Locale;
import java.util.Map;

/**
 * One canonical form for the email and phone sign-in names, so the unique keys on
 * {@code app_user.email} / {@code app_user.phone} cannot be bypassed by formatting: email is
 * trimmed and lower-cased; phone keeps only digits and is stored with a leading "+" (the number
 * must already include its country code).
 */
public final class LoginIdentifiers {

  private static final String EMAIL = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";
  private static final String PHONE_DIGITS = "[1-9][0-9]{6,14}";

  private LoginIdentifiers() {}

  /** Canonical email, or 400 VALIDATION when it is not an email address. */
  public static String email(String raw) {
    String value = raw.trim().toLowerCase(Locale.ROOT);
    if (!value.matches(EMAIL)) {
      throw invalid("email", "Enter a valid email address.");
    }
    return value;
  }

  /** Canonical "+digits" phone, or 400 VALIDATION when it is not an international number. */
  public static String phone(String raw) {
    String value = phoneOrNull(raw);
    if (value == null) {
      throw invalid("phone", "Enter a valid phone number with country code.");
    }
    return value;
  }

  /** Canonical "+digits" phone, or null when the value cannot be a phone number (sign-in lookup). */
  public static String phoneOrNull(String raw) {
    String digits = raw.trim().replaceAll("[\\s().-]", "");
    if (digits.startsWith("+")) {
      digits = digits.substring(1);
    }
    return digits.matches(PHONE_DIGITS) ? "+" + digits : null;
  }

  private static ApiException invalid(String field, String message) {
    return new ApiException(ErrorCode.VALIDATION, message, Map.of(field, message));
  }
}
