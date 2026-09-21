package ca.sait.dealerops.aiservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class InternalGuardFilter extends OncePerRequestFilter {

  @Value("${dealerops.internal-header-name:X-Dealer-Internal}")
  private String headerName;

  @Value("${dealerops.internal-token:dealer-internal}")
  private String expectedToken;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String path = request.getRequestURI();
    if (path != null && path.startsWith("/internal/v1/")) {
      String header = request.getHeader(headerName);
      if (header == null || !expectedToken.equals(header)) {
        response.setStatus(HttpServletResponse.SC_NOT_FOUND);
        return;
      }
    }
    filterChain.doFilter(request, response);
  }
}
