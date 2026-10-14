package com.dealerops.core.integration;

public class AiCallFailed extends RuntimeException {

  public AiCallFailed(String message) {
    super(message);
  }

  public AiCallFailed(String message, Throwable cause) {
    super(message, cause);
  }
}
