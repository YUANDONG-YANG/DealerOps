package com.carventory.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "api_logs")
public class ApiLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String methodName;
    private String uri;
    private String httpMethod;
    private int status;
    private String username;
    private LocalDateTime timestamp;

    private long executionTime; // in milliseconds

    private String clientIp;

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = true)
    private Company company;
}
