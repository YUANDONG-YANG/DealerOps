package com.dealerops.core.security;

import com.dealerops.core.dealer.AppRole;

public record CurrentUser(String oid, String tid, AppRole role, Long tenantDealerId) {}
