package ca.sait.dealerops.aiservice.support;

import org.springframework.http.HttpStatus;

public class ModelFailureException extends RuntimeException {

  public static final String TIMEOUT = "AI_TIMEOUT";
  public static final String KEY_MISSING = "AI_KEY_MISSING";
  public static final String PROVIDER_FAILED = "AI_PROVIDER_FAILED";

  private final HttpStatus status;
  private final String code;

  public ModelFailureException(HttpStatus status, String code, String message) {
    super(message);
    this.status = status;
    this.code = code;
  }

  public static ModelFailureException timeout() {
    return new ModelFailureException(
        HttpStatus.GATEWAY_TIMEOUT, TIMEOUT, "Model call exceeded 15s.");
  }

  public static ModelFailureException keyMissing() {
    return new ModelFailureException(
        HttpStatus.SERVICE_UNAVAILABLE, KEY_MISSING, "AIMANAGER_API_KEY is missing or invalid.");
  }

  public static ModelFailureException providerFailed() {
    return new ModelFailureException(
        HttpStatus.BAD_GATEWAY, PROVIDER_FAILED, "Model did not return a usable result.");
  }

  public HttpStatus status() {
    return status;
  }

  public String code() {
    return code;
  }
}
