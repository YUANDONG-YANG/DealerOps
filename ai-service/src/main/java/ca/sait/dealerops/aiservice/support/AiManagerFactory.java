package ca.sait.dealerops.aiservice.support;

import com.manager.AiManager;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class AiManagerFactory {

  private static final Logger log = LoggerFactory.getLogger(AiManagerFactory.class);

  @Value("${aimanager.api-key:}")
  private String apiKey;

  @Value("${aimanager.gateway-provider:groq}")
  private String provider;

  @Value("${aimanager.gateway-model:}")
  private String model;

  @PostConstruct
  void logApiKeyStatus() {
    log.info(
        "AIMANAGER_API_KEY configured: {} (provider={}, model={})",
        hasApiKey(),
        provider,
        StringUtils.hasText(model) ? model : "current");
  }

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
    try {
      return new AiManager(apiKey.trim(), provider, resolvedModel);
    } catch (RuntimeException ex) {
      // e.g. unknown provider: map to the fixed 502 body instead of a bare 500
      throw ModelFailureException.providerFailed();
    }
  }
}
