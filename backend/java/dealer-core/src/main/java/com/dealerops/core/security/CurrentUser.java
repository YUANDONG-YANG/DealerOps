package com.dealerops.core.security;

import com.dealerops.core.dealer.AppRole;

public record CurrentUser(String username, AppRole role, Long tenantDealerId) {}
