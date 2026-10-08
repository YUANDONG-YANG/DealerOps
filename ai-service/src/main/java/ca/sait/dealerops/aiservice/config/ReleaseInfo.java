package ca.sait.dealerops.aiservice.config;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.info.Info;
import org.springframework.boot.actuate.info.InfoContributor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.info.BuildProperties;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Release time of this service (design/20-Observability.md): {@code PUBLISHED_AT} when the deploy
 * step stamped it, otherwise the Maven build time, otherwise "local". Logged once at startup and
 * served as {@code release.publishedAt} on /actuator/info.
 */
@Component
public class ReleaseInfo implements InfoContributor {

  private static final Logger log = LoggerFactory.getLogger(ReleaseInfo.class);

  private final String serviceName;
  private final String publishedAt;

  public ReleaseInfo(
      @Value("${spring.application.name}") String serviceName,
      @Value("${dealerops.published-at:}") String configured,
      ObjectProvider<BuildProperties> buildProperties) {
    this.serviceName = serviceName;
    this.publishedAt = resolve(configured, buildProperties.getIfAvailable());
  }

  public String publishedAt() {
    return publishedAt;
  }

  @Override
  public void contribute(Info.Builder builder) {
    builder.withDetail("release", Map.of("publishedAt", publishedAt));
  }

  @EventListener(ApplicationReadyEvent.class)
  void logRelease() {
    log.info("Release: {} published {}", serviceName, publishedAt);
  }

  private static String resolve(String configured, BuildProperties build) {
    if (configured != null && !configured.isBlank()) {
      return configured.trim();
    }
    Instant builtAt = build == null ? null : build.getTime();
    return builtAt == null ? "local" : builtAt.truncatedTo(ChronoUnit.SECONDS).toString();
  }
}
