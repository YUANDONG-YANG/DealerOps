package com.carventory.dto;

import java.time.LocalDateTime;

public record ApiLogFilterDto(
    String username,
    String httpMethod,
    Integer status,
    LocalDateTime startDate,
    LocalDateTime endDate,
    String uri,
    Long companyId
) {}
