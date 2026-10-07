package com.dealerops.core.common.tenant;

import com.dealerops.core.common.ErrorBody;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.dealer.AppUserEntity;
import com.dealerops.core.dealer.AppUserRepository;
import com.dealerops.core.dealer.MembershipEntity;
import com.dealerops.core.dealer.MembershipRepository;
import com.dealerops.core.security.CurrentUser;
import com.dealerops.core.security.JwtRoleMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class TenantFilter extends OncePerRequestFilter {

  private static final Logger log = LoggerFactory.getLogger(TenantFilter.class);

  private final AppUserRepository appUserRepository;
  private final MembershipRepository membershipRepository;
  private final ObjectMapper objectMapper;
  private final TransactionTemplate transactionTemplate;

  public TenantFilter(
      AppUserRepository appUserRepository,
      MembershipRepository membershipRepository,
      ObjectMapper objectMapper,
      TransactionTemplate transactionTemplate) {
    this.appUserRepository = appUserRepository;
    this.membershipRepository = membershipRepository;
    this.objectMapper = objectMapper;
    this.transactionTemplate = transactionTemplate;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    try {
      Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
      if (!(authentication instanceof JwtAuthenticationToken jwtAuth) || !(jwtAuth.getToken() instanceof Jwt jwt)) {
        chain.doFilter(req, res);
        return;
      }

      String path = req.getRequestURI();
      boolean meGet = isMeGet(req, path);
      AppRole role = JwtRoleMapper.mapRole(jwt);
      if (role == null && !meGet) {
        log.warn(
            "requestId={} Rejecting request with no supported role username={} {} {} -> 403 FORBIDDEN",
            requestId(req),
            jwt.getSubject(),
            req.getMethod(),
            path);
        write(req, res, ErrorCode.FORBIDDEN, "Forbidden");
        return;
      }

      String username = jwt.getSubject();
      if (username == null || username.isBlank()) {
        write(req, res, ErrorCode.UNAUTHORIZED, "Unauthorized");
        return;
      }
      String displayName = firstNonBlank(jwt.getClaimAsString("name"), username);

      if (role == AppRole.PLATFORM_ADMIN) {
        if (!syncAppUser(username, displayName, role, null)) {
          write(req, res, ErrorCode.UNAUTHORIZED, "Unauthorized");
          return;
        }
        TenantContext.set(new CurrentUser(username, role, null));
        chain.doFilter(req, res);
        return;
      }

      if (role == AppRole.DEALER_USER) {
        List<MembershipEntity> rows = membershipRepository.findByUsernameAndActiveTrue(username);
        if (rows.size() >= 2) {
          write(req, res, 500, "CONFIG_ERROR", "Multiple active memberships");
          return;
        }
        Long dealerId = rows.size() == 1 ? rows.get(0).getDealerId() : null;
        if (!syncAppUser(username, displayName, role, dealerId)) {
          write(req, res, ErrorCode.UNAUTHORIZED, "Unauthorized");
          return;
        }
        TenantContext.set(new CurrentUser(username, role, dealerId));
        if (path.startsWith("/api/v1/admin")) {
          log.warn(
              "requestId={} Rejecting admin request for dealer user username={} {} {} -> 403 FORBIDDEN",
              requestId(req),
              username,
              req.getMethod(),
              path);
          write(req, res, ErrorCode.FORBIDDEN, "Forbidden");
          return;
        }
        if (!meGet && dealerId == null) {
          log.warn(
              "requestId={} Rejecting unbound dealer user username={} {} {} -> 403 FORBIDDEN",
              requestId(req),
              username,
              req.getMethod(),
              path);
          write(req, res, ErrorCode.FORBIDDEN, "Forbidden");
          return;
        }
        chain.doFilter(req, res);
        return;
      }

      if (!syncAppUser(username, displayName, null, null)) {
        write(req, res, ErrorCode.UNAUTHORIZED, "Unauthorized");
        return;
      }
      TenantContext.set(new CurrentUser(username, null, null));
      chain.doFilter(req, res);
    } finally {
      TenantContext.clear();
    }
  }

  /**
   * Accounts are created only by the admin (design/15-Data-Auth-and-Gateway.md S8.2), so a token
   * whose {@code sub} has no active {@code app_user} row is rejected instead of provisioning one.
   * Otherwise writes back the JWT role and the membership dealer id (S2.1 step 6, S2.4).
   */
  private boolean syncAppUser(String username, String displayName, AppRole jwtRole, Long dealerId) {
    return Boolean.TRUE.equals(
        transactionTemplate.execute(
            status -> {
              AppUserEntity user = appUserRepository.findByUsername(username).orElse(null);
              if (user == null || !user.isActive()) {
                return false;
              }
              user.setDisplayName(truncate(displayName, 120));
              if (jwtRole != null) {
                user.setRole(jwtRole);
              }
              user.setDealerId(jwtRole == AppRole.PLATFORM_ADMIN ? null : dealerId);
              appUserRepository.save(user);
              return true;
            }));
  }

  private static boolean isMeGet(HttpServletRequest req, String path) {
    return "GET".equalsIgnoreCase(req.getMethod()) && ("/api/v1/me".equals(path) || "/api/v1/me/".equals(path));
  }

  private void write(HttpServletRequest req, HttpServletResponse res, ErrorCode code, String message)
      throws IOException {
    write(req, res, code.getHttpStatus(), code.name(), message);
  }

  private void write(
      HttpServletRequest req, HttpServletResponse res, int status, String code, String message)
      throws IOException {
    log.warn("Rejecting {} {} -> {} {}", req.getMethod(), req.getRequestURI(), status, code);
    res.setStatus(status);
    res.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(res.getOutputStream(), new ErrorBody(code, message, null));
  }

  private static String requestId(HttpServletRequest req) {
    String requestId = req.getHeader("X-Request-ID");
    return requestId == null || requestId.isBlank() ? "missing" : requestId;
  }

  private static String firstNonBlank(String... values) {
    if (values == null) {
      return "";
    }
    for (String value : values) {
      if (value != null && !value.isBlank()) {
        return value;
      }
    }
    return "";
  }

  private static String truncate(String value, int max) {
    return value.length() <= max ? value : value.substring(0, max);
  }
}
