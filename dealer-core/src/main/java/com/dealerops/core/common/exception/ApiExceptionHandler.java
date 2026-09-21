package com.dealerops.core.common.exception;

import com.dealerops.core.common.ErrorBody;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

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
        .body(new ErrorBody(ErrorCode.VALIDATION.name(), "Request is invalid.", fieldErrors));
  }

  @ExceptionHandler({
    MissingServletRequestParameterException.class,
    MethodArgumentTypeMismatchException.class,
    HttpMessageNotReadableException.class
  })
  public ResponseEntity<ErrorBody> handleBadRequest(Exception ex) {
    Map<String, String> fieldErrors = new LinkedHashMap<>();
    if (ex instanceof MissingServletRequestParameterException missing) {
      fieldErrors.put(missing.getParameterName(), "must not be blank");
    }
    return ResponseEntity.status(ErrorCode.VALIDATION.getHttpStatus())
        .body(
            new ErrorBody(
                ErrorCode.VALIDATION.name(),
                "Request is invalid.",
                fieldErrors.isEmpty() ? null : fieldErrors));
  }

  @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
  public ResponseEntity<ErrorBody> handleOptimistic(ObjectOptimisticLockingFailureException ex) {
    return ResponseEntity.status(ErrorCode.VERSION_CONFLICT.getHttpStatus())
        .body(new ErrorBody(ErrorCode.VERSION_CONFLICT.name(), "Version conflict.", null));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ErrorBody> handleDup(DataIntegrityViolationException ex) {
    String constraint = constraintHint(ex);
    ErrorCode code = ErrorCode.VALIDATION;
    String message = "Duplicate or invalid data";
    if (constraint.contains("uk_vehicle_vin")) {
      code = ErrorCode.VIN_DUP;
      message = "VIN already exists in this dealership.";
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
