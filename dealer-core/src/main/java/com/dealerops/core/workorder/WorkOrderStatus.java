package com.dealerops.core.workorder;

import java.util.List;

/** OPEN → IN_PROGRESS → DONE; OPEN or IN_PROGRESS → CANCELLED. DONE and CANCELLED are final. */
public enum WorkOrderStatus {
  OPEN,
  IN_PROGRESS,
  DONE,
  CANCELLED;

  /** Statuses that still count as open work on the vehicle. */
  public static final List<WorkOrderStatus> OPEN_STATUSES = List.of(OPEN, IN_PROGRESS);

  public boolean isClosed() {
    return this == DONE || this == CANCELLED;
  }

  public boolean canMoveTo(WorkOrderStatus next) {
    return switch (this) {
      case OPEN -> next == IN_PROGRESS || next == DONE || next == CANCELLED;
      case IN_PROGRESS -> next == DONE || next == CANCELLED;
      case DONE, CANCELLED -> false;
    };
  }
}
