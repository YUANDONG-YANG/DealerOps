package ca.sait.dealerops.aiservice.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

/** Missing X-Dealer-Internal on /internal/v1/** is 404. */
class InternalGuardFilterTest {

  @Test
  void missingHeaderIs404() throws Exception {
    InternalGuardFilter filter = new InternalGuardFilter();
    ReflectionTestUtils.setField(filter, "headerName", "X-Dealer-Internal");
    ReflectionTestUtils.setField(filter, "expectedToken", "dealer-internal");
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/internal/v1/ad-check");
    MockHttpServletResponse response = new MockHttpServletResponse();
    filter.doFilter(request, response, new MockFilterChain());
    assertThat(response.getStatus()).isEqualTo(404);
  }

  @Test
  void healthDoesNotRequireInternalHeader() throws Exception {
    InternalGuardFilter filter = new InternalGuardFilter();
    ReflectionTestUtils.setField(filter, "headerName", "X-Dealer-Internal");
    ReflectionTestUtils.setField(filter, "expectedToken", "dealer-internal");
    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/health");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();
    filter.doFilter(request, response, chain);
    assertThat(chain.getRequest()).isNotNull();
    assertThat(response.getStatus()).isNotEqualTo(404);
  }

  @Test
  void wrongHeaderIs404() throws Exception {
    InternalGuardFilter filter = new InternalGuardFilter();
    ReflectionTestUtils.setField(filter, "headerName", "X-Dealer-Internal");
    ReflectionTestUtils.setField(filter, "expectedToken", "dealer-internal");
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/internal/v1/assistant");
    request.addHeader("X-Dealer-Internal", "wrong-token");
    MockHttpServletResponse response = new MockHttpServletResponse();
    filter.doFilter(request, response, new MockFilterChain());
    assertThat(response.getStatus()).isEqualTo(404);
  }

  @Test
  void matchingHeaderContinues() throws Exception {
    InternalGuardFilter filter = new InternalGuardFilter();
    ReflectionTestUtils.setField(filter, "headerName", "X-Dealer-Internal");
    ReflectionTestUtils.setField(filter, "expectedToken", "dealer-internal");
    MockHttpServletRequest request = new MockHttpServletRequest("POST", "/internal/v1/ad-check");
    request.addHeader("X-Dealer-Internal", "dealer-internal");
    MockHttpServletResponse response = new MockHttpServletResponse();
    MockFilterChain chain = new MockFilterChain();
    filter.doFilter(request, response, chain);
    assertThat(chain.getRequest()).isNotNull();
  }
}
