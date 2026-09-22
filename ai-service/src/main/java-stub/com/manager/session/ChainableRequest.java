package com.manager.session;

import com.manager.core.AIResponse;

/** Compile-only stand-in; {@link #send()} always fails like the stub {@code AiManager}. */
public class ChainableRequest {

  public AIResponse send() {
    return AIResponse.stubFailure();
  }
}
