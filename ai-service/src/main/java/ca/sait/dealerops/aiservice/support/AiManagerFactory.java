package ca.sait.dealerops.aiservice.support;

import com.manager.AiManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class AiManagerFactory {

  @Value("${aimanager.api-key:}")
  private String apiKey;

  @Value("${aimanager.gateway-provider:openai}")
  private String provider;

  @Value("${aimanager.gateway-model:}")
  private String model;

  public String apiKey() {
    return apiKey;
  }

  public boolean hasApiKey() {
    return StringUtils.hasText(apiKey);
  }

  /**
   * In-process public API only. Rate-limit queue stays off (3-arg constructor).
   * Do not start {@code com.AIApplication} or scan {@code com.gateway}.
   */
  public AiManager create() {
    if (!hasApiKey()) {
      throw ModelFailureException.keyMissing();
    }
    String resolvedModel = StringUtils.hasText(model) ? model : "current";
    return new AiManager(apiKey.trim(), provider, resolvedModel);
  }
}
