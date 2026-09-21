package ca.sait.dealerops.aiservice.config;

import ca.sait.dealerops.aiservice.support.AiFailureBody;
import ca.sait.dealerops.aiservice.support.ModelFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AiExceptionHandler {

  @ExceptionHandler(ModelFailureException.class)
  public ResponseEntity<AiFailureBody> handleModelFailure(ModelFailureException ex) {
    return ResponseEntity.status(ex.status()).body(AiFailureBody.of(ex.code(), ex.getMessage()));
  }
}
