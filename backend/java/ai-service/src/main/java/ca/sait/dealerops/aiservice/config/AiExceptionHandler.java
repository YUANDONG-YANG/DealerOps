package ca.sait.dealerops.aiservice.config;

import ca.sait.dealerops.aiservice.support.AiFailureBody;
import ca.sait.dealerops.aiservice.support.ModelFailureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AiExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(AiExceptionHandler.class);

  @ExceptionHandler(ModelFailureException.class)
  public ResponseEntity<AiFailureBody> handleModelFailure(ModelFailureException ex) {
    if (ex.status().is5xxServerError()) {
      log.error("AI model call failed: {} ({})", ex.code(), ex.getMessage());
    } else {
      log.warn("AI model call rejected: {} ({})", ex.code(), ex.getMessage());
    }
    return ResponseEntity.status(ex.status()).body(AiFailureBody.of(ex.code(), ex.getMessage()));
  }
}
