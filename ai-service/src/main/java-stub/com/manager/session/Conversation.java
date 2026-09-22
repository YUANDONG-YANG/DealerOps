package com.manager.session;

/**
 * Compile-only stand-in for the library conversation handle.
 * Real turns need {@code com.aimanager:aimanager} installed, not {@code -Pstub}.
 */
public class Conversation {

  public ChainableRequest request(String prompt) {
    return new ChainableRequest();
  }
}
