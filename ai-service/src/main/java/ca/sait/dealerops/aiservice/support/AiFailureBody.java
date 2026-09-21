package ca.sait.dealerops.aiservice.support;

public record AiFailureBody(boolean success, String code, String message) {
  public static AiFailureBody of(String code, String message) {
    return new AiFailureBody(false, code, message);
  }
}
