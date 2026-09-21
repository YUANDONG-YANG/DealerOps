package com.manager;

import com.manager.core.AIResponse;

/**
 * Compile-only stand-in when {@code com.aimanager:aimanager} is not installed.
 * Not a vendor copy of the real library. Real calls need {@code mvn -DskipTests install}
 * in the ai-manager checkout, then compile without {@code -Pstub}.
 */
public class AiManager {

  public AiManager(String apiKey, String provider, String model) {
    // no-op stub
  }

  public Object startConversation(String conversationId, String systemMessage) {
    return null;
  }

  public AIResponse request(String prompt) {
    return AIResponse.stubFailure();
  }

  public void closeConversation(String id) {
    // no-op stub
  }
}
