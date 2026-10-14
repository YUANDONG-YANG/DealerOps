package com.dealerops.core.compliance;

import com.dealerops.core.compliance.dto.RuleFinding;
import java.util.List;

public record OmvicResult(List<RuleFinding> findings, boolean hardBlocked) {}
