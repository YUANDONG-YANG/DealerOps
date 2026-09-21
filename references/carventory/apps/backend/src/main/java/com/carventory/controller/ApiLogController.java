package com.carventory.controller;

import com.carventory.dto.ApiLogFilterDto;
import com.carventory.entity.ApiLog;
import com.carventory.service.ApiLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class ApiLogController {

    private final ApiLogService apiLogService;

    @PostMapping("/filter")
    public ResponseEntity<List<ApiLog>> filterLogs(@RequestBody ApiLogFilterDto filter) {
        return ResponseEntity.ok(apiLogService.filterLogs(filter));
    }

    @GetMapping
    public ResponseEntity<List<ApiLog>> getAllLogs() {
        return ResponseEntity.ok(apiLogService.getAllLogs());
    }
}
