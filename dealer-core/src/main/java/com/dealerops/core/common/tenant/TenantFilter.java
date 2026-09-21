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
        write(res, ErrorCode.FORBIDDEN, "Forbidden");
        return;
      }

      String oid = jwt.getClaimAsString("oid");
      String tid = jwt.getClaimAsString("tid");
      if (oid == null || oid.isBlank() || tid == null || tid.isBlank()) {
        write(res, ErrorCode.UNAUTHORIZED, "Unauthorized");
        return;
      }
      String displayName = firstNonBlank(jwt.getClaimAsString("name"), jwt.getClaimAsString("preferred_username"), oid);

      if (role == AppRole.PLATFORM_ADMIN) {
        upsertAppUser(tid, oid, displayName, role, null, true);
        TenantContext.set(new CurrentUser(oid, tid, role, null));
        if (adminBlockedBusiness(req, path)) {
          write(res, ErrorCode.FORBIDDEN, "Forbidden");
          return;
        }
        chain.doFilter(req, res);
        return;
      }

      if (role == AppRole.DEALER_USER) {
        List<MembershipEntity> rows = membershipRepository.findByEntraOidAndActiveTrue(oid);
        if (rows.size() >= 2) {
          write(res, 500, "CONFIG_ERROR", "Multiple active memberships");
          return;
        }
        Long dealerId = rows.size() == 1 ? rows.get(0).getDealerId() : null;
        if (!meGet && dealerId == null) {
          upsertAppUser(tid, oid, displayName, role, null, false);
          TenantContext.set(new CurrentUser(oid, tid, role, null));
          write(res, ErrorCode.FORBIDDEN, "Forbidden");
          return;
        }
        upsertAppUser(tid, oid, displayName, role, dealerId, false);
        TenantContext.set(new CurrentUser(oid, tid, role, dealerId));
        chain.doFilter(req, res);
        return;
      }

      upsertAppUser(tid, oid, displayName, null, null, false);
      TenantContext.set(new CurrentUser(oid, tid, null, null));
      chain.doFilter(req, res);
    } finally {
      TenantContext.clear();
    }
  }

  private void upsertAppUser(
      String tid, String oid, String displayName, AppRole jwtRole, Long dealerId, boolean admin) {
    transactionTemplate.executeWithoutResult(
        status -> {
          AppUserEntity user =
              appUserRepository
                  .findByEntraTenantIdAndEntraOid(tid, oid)
                  .orElseGet(AppUserEntity::new);
          user.setEntraTenantId(tid);
          user.setEntraOid(oid);
          if (displayName != null && !displayName.isBlank()) {
            user.setDisplayName(truncate(displayName, 120));
          } else if (user.getDisplayName() == null) {
            user.setDisplayName(oid);
          }
          if (jwtRole != null) {
            user.setRole(jwtRole);
          } else if (user.getRole() == null) {
            user.setRole(AppRole.DEALER_USER);
          }
          user.setActive(true);
          if (admin) {
            user.setDealerId(null);
          } else if (dealerId != null && (user.getDealerId() == null || !dealerId.equals(user.getDealerId()))) {
            user.setDealerId(dealerId);
          }
          appUserRepository.save(user);
        });
  }

  private static boolean isMeGet(HttpServletRequest req, String path) {
    return "GET".equalsIgnoreCase(req.getMethod()) && ("/api/v1/me".equals(path) || "/api/v1/me/".equals(path));
  }

  private static boolean adminBlockedBusiness(HttpServletRequest req, String path) {
    if (path.startsWith("/api/v1/vehicles")
        || path.startsWith("/api/v1/customers")
        || path.startsWith("/api/v1/listings")
        || path.startsWith("/api/v1/assistant")) {
      return true;
    }
    return "GET".equalsIgnoreCase(req.getMethod())
        && (path.equals("/api/v1/audit") || path.startsWith("/api/v1/audit/"));
  }

  private void write(HttpServletResponse res, ErrorCode code, String message) throws IOException {
    write(res, code.getHttpStatus(), code.name(), message);
  }

  private void write(HttpServletResponse res, int status, String code, String message) throws IOException {
    res.setStatus(status);
    res.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(res.getOutputStream(), new ErrorBody(code, message, null));
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
