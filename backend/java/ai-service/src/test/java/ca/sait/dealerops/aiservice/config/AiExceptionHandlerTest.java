package ca.sait.dealerops.aiservice.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.sait.dealerops.aiservice.support.ModelFailureException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** PROTOCOL §B.2 failure body: success=false plus the pinned HTTP/code/message table. */
class AiExceptionHandlerTest {

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(new DummyApi()).setControllerAdvice(new AiExceptionHandler()).build();
  }

  @Test
  void timeoutIs504AiTimeout() throws Exception {
    var result = mockMvc.perform(get("/e/timeout")).andExpect(status().isGatewayTimeout()).andReturn();
    assertThat(result.getResponse().getContentAsString()).contains("\"success\":false");
    assertThat(result.getResponse().getContentAsString()).contains("\"code\":\"AI_TIMEOUT\"");
    assertThat(result.getResponse().getContentAsString()).contains("Model call exceeded 15s.");
  }

  @Test
  void missingKeyIs503() throws Exception {
    var result = mockMvc.perform(get("/e/key")).andExpect(status().isServiceUnavailable()).andReturn();
    assertThat(result.getResponse().getContentAsString()).contains("\"code\":\"AI_KEY_MISSING\"");
    assertThat(result.getResponse().getContentAsString())
        .contains("AIMANAGER_API_KEY is missing or invalid.");
  }

  @Test
  void providerFailedIs502() throws Exception {
    var result = mockMvc.perform(get("/e/provider")).andExpect(status().isBadGateway()).andReturn();
    assertThat(result.getResponse().getContentAsString()).contains("\"code\":\"AI_PROVIDER_FAILED\"");
    assertThat(result.getResponse().getContentAsString()).contains("Model did not return a usable result.");
  }

  @RestController
  static class DummyApi {
    @GetMapping("/e/timeout")
    void timeout() {
      throw ModelFailureException.timeout();
    }

    @GetMapping("/e/key")
    void key() {
      throw ModelFailureException.keyMissing();
    }

    @GetMapping("/e/provider")
    void provider() {
      throw ModelFailureException.providerFailed();
    }
  }
}
