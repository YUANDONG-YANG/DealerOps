package com.dealerops.core.compliance.dto;

public record RuleFinding(String ruleId, String severity, boolean passed, String message) {}
