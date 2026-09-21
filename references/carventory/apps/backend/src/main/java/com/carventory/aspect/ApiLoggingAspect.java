package com.carventory.aspect;

import com.carventory.dto.UserInfoResponse;
import com.carventory.entity.ApiLog;
import com.carventory.repository.ApiLogRepository;
import com.carventory.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.stream.Collectors;

@Aspect
@Component
public class ApiLoggingAspect {

    private final ApiLogRepository apiLogRepository;
    private final ObjectMapper objectMapper;
    private final UserService userService;

    public ApiLoggingAspect(ApiLogRepository apiLogRepository, ObjectMapper objectMapper, UserService userService) {
        this.apiLogRepository = apiLogRepository;
        this.objectMapper = objectMapper;
        this.userService = userService;
    }

    @Pointcut("within(@org.springframework.web.bind.annotation.RestController *)")
    public void restControllerMethods() {}

    @Around("restControllerMethods()")
    public Object logApiCall(ProceedingJoinPoint joinPoint) throws Throwable {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        HttpServletResponse response = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getResponse();

        String requestBody = extractRequestBody(joinPoint);
        String uri = request.getRequestURI();
        String method = joinPoint.getSignature().toShortString();
        String httpMethod = request.getMethod();
        String username = getUsername();
        String clientIp = getClientIp(request);

        LocalDateTime timestamp = LocalDateTime.now();
        long start = System.currentTimeMillis();

        Object result = null;
        try {
            result = joinPoint.proceed();
        } catch (Throwable ex) {
            throw ex;
        } finally {
            long duration = System.currentTimeMillis() - start;

            String responseBody = objectMapper.writeValueAsString(result);

            ApiLog log = new ApiLog();
            log.setMethodName(method);
            log.setUri(uri);
            log.setHttpMethod(httpMethod);
            log.setUsername(username);
            log.setTimestamp(timestamp);
            log.setExecutionTime(duration);
            log.setClientIp(clientIp);

            if (response != null) {
                log.setStatus(response.getStatus());
            }

            // Safely handle nulls
            UserInfoResponse userInfoResponse = userService.getCurrentUserInfo();
            if (userInfoResponse != null && userInfoResponse.getCompany() != null) {
                log.setCompany(userInfoResponse.getCompany());
            } else {
                log.setCompany(null); // company remains null for anonymous or missing users
            }
            apiLogRepository.save(log);
        }

        return result;
    }

    private String extractRequestBody(ProceedingJoinPoint joinPoint) {
        try {
            Object[] args = joinPoint.getArgs();
            return Arrays.stream(args)
                    .filter(arg -> !(arg instanceof HttpServletRequest || arg instanceof HttpServletResponse || arg instanceof MultipartFile))
                    .map(arg -> {
                        try {
                            return objectMapper.writeValueAsString(arg);
                        } catch (Exception e) {
                            return "Could not serialize";
                        }
                    })
                    .collect(Collectors.joining(", "));
        } catch (Exception e) {
            return "Error extracting request body";
        }
    }

    private String getUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            return auth.getName();
        }
        return "Anonymous";
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        return xfHeader != null ? xfHeader.split(",")[0] : request.getRemoteAddr();
    }
}
