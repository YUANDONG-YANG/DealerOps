package ca.sait.dealerops.aiservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Missing or wrong {@code X-Dealer-Internal} on {@code /internal/v1/**} → 404.
 *
 * <p>The well-known local default token is a credential only when the process
 * explicitly runs the {@code dev} or {@code local} Spring profile. Any other
 * profile, including no active profile, fails closed at startup.
 */
@Component
public class InternalGuardFilter extends OncePerRequestFilter {

  static final String WELL_KNOWN_DEFAULT_TOKEN = "dealer-internal";

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
    String path = request.getRequestURI();
    if (path != null && path.startsWith("/internal/v1/")) {
      String header = request.getHeader(headerName);
      if (wellKnownDefaultBlocked() || header == null || !expectedToken.equals(header)) {
        response.setStatus(HttpServletResponse.SC_NOT_FOUND);
        return;
      }
    }
    filterChain.doFilter(request, response);
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
