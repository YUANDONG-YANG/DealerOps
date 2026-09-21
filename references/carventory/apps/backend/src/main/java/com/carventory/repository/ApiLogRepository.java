package com.carventory.repository;

import com.carventory.entity.ApiLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface ApiLogRepository extends JpaRepository<ApiLog, Long>, JpaSpecificationExecutor<ApiLog> {

    int deleteByTimestampBefore(LocalDateTime cutoff);

}
