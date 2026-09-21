package com.manager.core;

/** Compile-only stand-in for {@code com.manager.core.AIResponse}. */
public class AIResponse {

  public static AIResponse stubFailure() {
    return new AIResponse();
  }

  public boolean isSuccess() {
    return false;
  }

  public String getContent() {
    return "";
  }
}
