package com.dealerops.core.compliance.dto;

import java.util.List;

public record OmvicResult(List<RuleFinding> findings, boolean hardBlocked) {}
