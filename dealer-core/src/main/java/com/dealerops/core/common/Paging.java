package com.dealerops.core.common;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

public final class Paging {

  private Paging() {}

  public static int size(int requested) {
    return requested <= 0 ? 10 : Math.min(requested, 10);
  }

  public static int page(int requested) {
    return Math.max(requested, 0);
  }

  public static PageRequest of(int page, int size) {
    return PageRequest.of(page(page), size(size));
  }

  public static PageRequest of(int page, int size, Sort sort) {
    return PageRequest.of(page(page), size(size), sort);
  }
}
