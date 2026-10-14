package ca.sait.dealerops.aiservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class RequestLoggingFilter extends OncePerRequestFilter {

  private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);
  private static final String REQUEST_ID = "X-Request-ID";

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    long started = System.nanoTime();
    try {
      filterChain.doFilter(request, response);
    } finally {
      long elapsedMs = (System.nanoTime() - started) / 1_000_000;
      log.info(
          "requestId={} {} {} status={} durationMs={}",
          request.getHeader(REQUEST_ID),
          request.getMethod(),
          request.getRequestURI(),
          response.getStatus(),
          elapsedMs);
    }
  }
}
