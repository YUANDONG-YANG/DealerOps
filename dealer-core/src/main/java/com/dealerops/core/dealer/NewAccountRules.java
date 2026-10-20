package com.dealerops.core.dealer;

import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

/**
 * Rules every new account follows, whether it comes from self sign-up or from an admin bind:
 * an email and/or phone in canonical form, and a username, full name, email, and phone that no
 * other account uses. Every failure names the request field it belongs to.
 */
@Component
public class NewAccountRules {

  /** Canonical sign-in contact; at least one of the two is set. */
  public record Contact(String email, String phone) {}

  private static final String MISSING_CONTACT = "Enter an email address or a phone number.";

  private final AppUserRepository users;

  public NewAccountRules(AppUserRepository users) {
    this.users = users;
  }

  public Contact contact(String rawEmail, String rawPhone) {
    boolean noEmail = rawEmail == null || rawEmail.isBlank();
    boolean noPhone = rawPhone == null || rawPhone.isBlank();
    if (noEmail && noPhone) {
      throw new ApiException(
          ErrorCode.VALIDATION, MISSING_CONTACT, Map.of("email", MISSING_CONTACT, "phone", MISSING_CONTACT));
    }
    Map<String, String> invalid = new LinkedHashMap<>();
    String email = noEmail ? null : canonical(() -> LoginIdentifiers.email(rawEmail), invalid);
    String phone = noPhone ? null : canonical(() -> LoginIdentifiers.phone(rawPhone), invalid);
    if (!invalid.isEmpty()) {
      throw new ApiException(ErrorCode.VALIDATION, invalid.values().iterator().next(), invalid);
    }
    return new Contact(email, phone);
  }

  /** 409 with the first taken field's code; fieldErrors lists every taken field. */
  public void requireAvailable(String username, String displayName, Contact contact) {
    Map<String, String> taken = new LinkedHashMap<>();
    ErrorCode first = null;
    if (users.existsByUsername(username)) {
      first = put(taken, first, Conflict.USERNAME);
    }
    if (users.existsByDisplayNameIgnoreCase(displayName)) {
      first = put(taken, first, Conflict.DISPLAY_NAME);
    }
    if (contact.email() != null && users.existsByEmailIgnoreCase(contact.email())) {
      first = put(taken, first, Conflict.EMAIL);
    }
    if (contact.phone() != null && users.existsByPhone(contact.phone())) {
      first = put(taken, first, Conflict.PHONE);
    }
    if (first != null) {
      throw new ApiException(first, taken.values().iterator().next(), taken);
    }
  }

  /** A unique key that fired after the checks above (a concurrent sign-up) maps to its field. */
  public ApiException conflict(DataIntegrityViolationException ex) {
    String cause = String.valueOf(ex.getMostSpecificCause().getMessage());
    for (Conflict conflict : Conflict.values()) {
      if (cause.contains(conflict.constraint)) {
        return new ApiException(conflict.code, conflict.message, Map.of(conflict.field, conflict.message));
      }
    }
    return new ApiException(ErrorCode.USERNAME_TAKEN, Conflict.USERNAME.message, Map.of("username", Conflict.USERNAME.message));
  }

  private static ErrorCode put(Map<String, String> taken, ErrorCode first, Conflict conflict) {
    taken.put(conflict.field, conflict.message);
    return first == null ? conflict.code : first;
  }

  private static String canonical(java.util.function.Supplier<String> normalize, Map<String, String> invalid) {
    try {
      return normalize.get();
    } catch (ApiException ex) {
      invalid.putAll(ex.getFieldErrors());
      return null;
    }
  }

  private enum Conflict {
    USERNAME("username", ErrorCode.USERNAME_TAKEN, "uk_user_username", "That username is already taken."),
    DISPLAY_NAME("displayName", ErrorCode.DISPLAY_NAME_TAKEN, "uk_app_user_display_name", "That full name is already registered."),
    EMAIL("email", ErrorCode.EMAIL_TAKEN, "uk_app_user_email", "That email address is already registered."),
    PHONE("phone", ErrorCode.PHONE_TAKEN, "uk_app_user_phone", "That phone number is already registered.");

    private final String field;
    private final ErrorCode code;
    private final String constraint;
    private final String message;

    Conflict(String field, ErrorCode code, String constraint, String message) {
      this.field = field;
      this.code = code;
      this.constraint = constraint;
      this.message = message;
    }
  }
}
