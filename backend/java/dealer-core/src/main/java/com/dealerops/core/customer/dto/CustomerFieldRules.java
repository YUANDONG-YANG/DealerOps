package com.dealerops.core.customer.dto;

/** Shared validation limits for the customer contact fields (requirements CRM field table). */
final class CustomerFieldRules {

  /** 7-20 digits; only digits, '+', '-', '(', ')' and spaces are allowed. */
  static final String PHONE_PATTERN = "^(?=(?:\\D*\\d){7,20}\\D*$)[0-9+\\-() ]+$";

  static final int NAME_MAX = 100;

  /** customer.email is VARCHAR(254) since V20261007_2__widen_customer_email.sql. */
  static final int EMAIL_MAX = 254;

  static final int PHONE_MAX = 40;

  static final int HOME_ADDRESS_MAX = 300;

  private CustomerFieldRules() {}
}
