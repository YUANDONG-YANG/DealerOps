package com.dealerops.core.common.tenant;

import com.dealerops.core.security.CurrentUser;

public final class TenantContext {

  private static final ThreadLocal<CurrentUser> H = new ThreadLocal<>();

  private TenantContext() {}

  public static void set(CurrentUser u) {
    H.set(u);
  }

  public static CurrentUser get() {
    return H.get();
  }

  public static void clear() {
    H.remove();
  }
}
