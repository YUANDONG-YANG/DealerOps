package com.carventory.service;

import com.carventory.dto.ApiLogFilterDto;
import com.carventory.entity.ApiLog;
import com.carventory.repository.ApiLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApiLogService {

    private final ApiLogRepository apiLogRepository;

    public List<ApiLog> filterLogs(ApiLogFilterDto filter) {
        Specification<ApiLog> spec = Specification.where(null);

        if (filter.username() != null && !filter.username().isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("username"), filter.username()));
        }

        if (filter.httpMethod() != null && !filter.httpMethod().isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("httpMethod"), filter.httpMethod()));
        }

        if (filter.status() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), filter.status()));
        }

        if (filter.startDate() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("timestamp"), filter.startDate()));
        }

        if (filter.endDate() != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("timestamp"), filter.endDate()));
        }

        if (filter.uri() != null && !filter.uri().isEmpty()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("uri"), filter.uri()));
        }

        if (filter.companyId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("company").get("id"), filter.companyId()));
        }

        return apiLogRepository.findAll(spec);
    }

    public List<ApiLog> getAllLogs() {
        return apiLogRepository.findAll();
    }

    // Run every day at 2 AM
    @Scheduled(cron = "0 0 2 * * *")
    public void deleteOldLogs() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30); // Keep last 30 days
        int deletedCount = apiLogRepository.deleteByTimestampBefore(cutoffDate);
        log.info("Deleted {} old API logs (before {}).", deletedCount, cutoffDate);
    }
}
