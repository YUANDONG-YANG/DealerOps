package ca.sait.dealerops.aiservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.UrlPathHelper;

/**
 * Missing or wrong {@code X-Dealer-Internal} on {@code /internal/v1/**} → 404.
 *
 * <p>The well-known local default token is a credential only when the process
 * explicitly runs the {@code dev} or {@code local} Spring profile. Any other
 * profile, including no active profile, fails closed at startup.
 */
@Component
public class InternalGuardFilter extends OncePerRequestFilter {

  private static final Logger log = LoggerFactory.getLogger(InternalGuardFilter.class);

  static final String WELL_KNOWN_DEFAULT_TOKEN = "dealer-internal";

  /**
   * Decodes, strips {@code ;} path parameters, and collapses {@code //} the same way MVC
   * matching does, so {@code /%69nternal/v1/...} or {@code /internal;x/v1/...} cannot skip the
   * guard while still reaching a controller.
   */
  private static final UrlPathHelper PATH_HELPER = new UrlPathHelper();

  @Value("${dealerops.internal-header-name:X-Dealer-Internal}")
  private String headerName;

  @Value("${dealerops.internal-token:dealer-internal}")
  private String expectedToken;

  @Autowired
  private Environment environment;

  /**
   * Invoked from {@code GenericFilterBean.afterPropertiesSet()} after properties
   * are injected. Fail closed before the filter can serve traffic.
   */
  @Override
  protected void initFilterBean() {
    if (!StringUtils.hasText(expectedToken)) {
      throw new IllegalStateException("Refusing to start: INTERNAL_TOKEN is blank.");
    }
    if (WELL_KNOWN_DEFAULT_TOKEN.equals(expectedToken) && !devProfileExplicitlySelected()) {
      throw new IllegalStateException(
          "Refusing to start: INTERNAL_TOKEN is the well-known default and no dev or local"
              + " Spring profile is active. Set a non-default INTERNAL_TOKEN, or set"
              + " SPRING_PROFILES_ACTIVE to dev or local for classroom/local only.");
    }
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String path = PATH_HELPER.getPathWithinApplication(request);
    if (path != null && path.startsWith("/internal/")) {
      if (wellKnownDefaultBlocked() || !tokenMatches(request.getHeader(headerName))) {
        log.warn("Rejecting internal request {} {} (missing or invalid {})", request.getMethod(), path, headerName);
        response.setStatus(HttpServletResponse.SC_NOT_FOUND);
        return;
      }
    }
    filterChain.doFilter(request, response);
  }

  /** Blank configured or presented tokens never match; comparison is constant-time. */
  private boolean tokenMatches(String header) {
    if (!StringUtils.hasText(expectedToken) || !StringUtils.hasText(header)) {
      return false;
    }
    return MessageDigest.isEqual(
        expectedToken.getBytes(StandardCharsets.UTF_8), header.getBytes(StandardCharsets.UTF_8));
  }

  /**
   * Spring always injects {@link Environment}. A null environment is not a running
   * profile selection, so the startup check stays fail-closed for that case.
   */
  private boolean wellKnownDefaultBlocked() {
    return environment != null
        && WELL_KNOWN_DEFAULT_TOKEN.equals(expectedToken)
        && !devProfileExplicitlySelected();
  }

  private boolean devProfileExplicitlySelected() {
    if (environment == null) {
      return false;
    }
    for (String profile : environment.getActiveProfiles()) {
      if (profile == null) {
        continue;
      }
      String name = profile.trim().toLowerCase(Locale.ROOT);
      if ("dev".equals(name) || "local".equals(name)) {
        return true;
      }
    }
    return false;
  }
}
