package com.dealerops.core.common.exception;

public enum ErrorCode {
  VALIDATION(400),
  VIN_DUP(400),
  SOLD_PAIR_REQUIRED(400),
  WRONG_DEALER_OR_SOLD(400),
  UNAUTHORIZED(401),
  FORBIDDEN(403),
  NOT_FOUND(404),
  VERSION_CONFLICT(409),
  DUP_MEMBER(409),
  VEHICLE_ALREADY_LINKED(409),
  SOLD_LOCKED(409),
  CHECK_STALE(409),
  NOT_PASSED(409),
  AI_UNAVAILABLE(502);

  private final int httpStatus;

  ErrorCode(int httpStatus) {
    this.httpStatus = httpStatus;
  }

  public int getHttpStatus() {
    return httpStatus;
  }
}
