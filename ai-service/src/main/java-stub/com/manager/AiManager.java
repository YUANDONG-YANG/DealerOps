package com.manager;

import com.manager.core.AIResponse;
import com.manager.session.Conversation;

/**
 * Compile-only stand-in when {@code com.aimanager:aimanager} is not installed.
 * Not a vendor copy of the real library. Real calls need {@code mvn -DskipTests install}
 * in the sibling {@code ai-manager} checkout, then compile without {@code -Pstub}.
 */
public class AiManager {

  public AiManager(String apiKey, String provider, String model) {
    // no-op stub
  }

  public Conversation startConversation(String conversationId, String systemMessage) {
    return new Conversation();
  }

  public AIResponse request(String prompt) {
    return AIResponse.stubFailure();
  }

  public void closeConversation(String id) {
    // no-op stub
  }
}
