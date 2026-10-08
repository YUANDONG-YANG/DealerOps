package com.dealerops.core.common.exception;

import java.util.Map;

public class ApiException extends RuntimeException {

  private final ErrorCode code;
  private final Map<String, String> fieldErrors;

  public ApiException(ErrorCode code, String message) {
    this(code, message, null);
  }

  /** {@code fieldErrors} keys are request field names, so the client can show each under its input. */
  public ApiException(ErrorCode code, String message, Map<String, String> fieldErrors) {
    super(message);
    this.code = code;
    this.fieldErrors = fieldErrors == null || fieldErrors.isEmpty() ? null : Map.copyOf(fieldErrors);
  }

  public ErrorCode getCode() {
    return code;
  }

  public Map<String, String> getFieldErrors() {
    return fieldErrors;
  }
}
