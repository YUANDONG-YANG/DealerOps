package com.dealerops.core.common.exception;

import com.dealerops.core.common.ErrorBody;
import com.dealerops.core.photo.VehiclePhotoService;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class ApiExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ErrorBody> handleApi(ApiException ex) {
    ErrorCode code = ex.getCode();
    return ResponseEntity.status(code.getHttpStatus())
        .body(new ErrorBody(code.name(), ex.getMessage(), ex.getFieldErrors()));
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

  /** Upload over spring.servlet.multipart limits (Image Studio photos). */
  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<ErrorBody> handleUploadSize(MaxUploadSizeExceededException ex) {
    String message =
        ex.getMaxUploadSize() > 0
            ? VehiclePhotoService.tooLargeMessage(ex.getMaxUploadSize())
            : "Upload is too large.";
    return ResponseEntity.status(ErrorCode.VALIDATION.getHttpStatus())
        .body(new ErrorBody(ErrorCode.VALIDATION.name(), message, null));
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
    } else if (constraint.contains("uk_membership") || constraint.contains("uk_user_username")) {
      code = ErrorCode.DUP_MEMBER;
      message = "Membership already exists";
    }
    return ResponseEntity.status(code.getHttpStatus()).body(new ErrorBody(code.name(), message, null));
  }

  /**
   * Last resort. Remaining Spring MVC errors (unknown path, wrong method or media type) keep their
   * status; anything else is logged server-side and returned without stack, SQL, or model text.
   */
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorBody> handleUnexpected(Exception ex) {
    if (ex instanceof ErrorResponse framework && framework.getStatusCode().value() < 500) {
      int status = framework.getStatusCode().value();
      ErrorBody body =
          switch (status) {
            case 404 -> new ErrorBody(ErrorCode.NOT_FOUND.name(), "Not found", null);
            case 405 -> new ErrorBody(ErrorCode.METHOD_NOT_ALLOWED.name(), "Method not allowed.", null);
            case 415 ->
                new ErrorBody(ErrorCode.UNSUPPORTED_MEDIA_TYPE.name(), "Unsupported media type.", null);
            default -> new ErrorBody(ErrorCode.VALIDATION.name(), "Request is invalid.", null);
          };
      return ResponseEntity.status(status).body(body);
    }
    log.error("Unhandled request error", ex);
    return ResponseEntity.status(ErrorCode.INTERNAL_ERROR.getHttpStatus())
        .body(new ErrorBody(ErrorCode.INTERNAL_ERROR.name(), "Unexpected server error.", null));
  }

  private static String constraintHint(DataIntegrityViolationException ex) {
    Throwable cause = ex.getMostSpecificCause();
    return cause == null || cause.getMessage() == null ? "" : cause.getMessage().toLowerCase();
  }
}
