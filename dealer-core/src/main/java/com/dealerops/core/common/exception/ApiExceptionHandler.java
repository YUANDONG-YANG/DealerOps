package com.dealerops.core.common.exception;

import com.dealerops.core.common.ErrorBody;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ErrorBody> handleApi(ApiException ex) {
    ErrorCode code = ex.getCode();
    return ResponseEntity.status(code.getHttpStatus())
        .body(new ErrorBody(code.name(), ex.getMessage(), null));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorBody> handleValid(MethodArgumentNotValidException ex) {
    Map<String, String> fieldErrors = new LinkedHashMap<>();
    ex.getBindingResult()
        .getFieldErrors()
        .forEach(err -> fieldErrors.putIfAbsent(err.getField(), err.getDefaultMessage()));
    return ResponseEntity.status(ErrorCode.VALIDATION.getHttpStatus())
        .body(new ErrorBody(ErrorCode.VALIDATION.name(), "Validation failed", fieldErrors));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ErrorBody> handleDup(DataIntegrityViolationException ex) {
    String constraint = constraintHint(ex);
    ErrorCode code = ErrorCode.VALIDATION;
    String message = "Duplicate or invalid data";
    if (constraint.contains("uk_vehicle_vin")) {
      code = ErrorCode.VIN_DUP;
      message = "VIN already exists for this dealer";
    } else if (constraint.contains("uk_cv_vehicle")) {
      code = ErrorCode.VEHICLE_ALREADY_LINKED;
      message = "Vehicle is already linked";
    } else if (constraint.contains("uk_membership")) {
      code = ErrorCode.DUP_MEMBER;
      message = "Membership already exists";
    }
    return ResponseEntity.status(code.getHttpStatus()).body(new ErrorBody(code.name(), message, null));
  }

  private static String constraintHint(DataIntegrityViolationException ex) {
    Throwable cause = ex.getMostSpecificCause();
    return cause == null || cause.getMessage() == null ? "" : cause.getMessage().toLowerCase();
  }
}
