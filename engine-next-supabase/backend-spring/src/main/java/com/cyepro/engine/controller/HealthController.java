package com.cyepro.engine.controller;

import com.cyepro.engine.service.AIService;
import com.cyepro.engine.repository.NotificationEventRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class HealthController {

    private final AIService aiService;
    private final NotificationEventRepository eventRepo;

    public HealthController(AIService aiService, NotificationEventRepository eventRepo) {
        this.aiService = aiService;
        this.eventRepo = eventRepo;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> aiStatus = aiService.getStatus();

        String dbStatus = "CONNECTED";
        try {
            eventRepo.count();
        } catch (Exception e) {
            dbStatus = "DISCONNECTED";
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "CONNECTED".equals(dbStatus) ? "OK" : "DEGRADED");
        response.put("timestamp", java.time.OffsetDateTime.now().toString());
        response.put("engine", "READY");
        response.put("stack", "SPRING_BOOT_SUPABASE");
        response.put("database", dbStatus);

        Map<String, Object> aiInfo = new LinkedHashMap<>(aiStatus);
        aiInfo.put("status", "CLOSED".equals(aiStatus.get("circuitBreaker")) ? "HEALTHY" : "CIRCUIT_OPEN");
        response.put("ai_service", aiInfo);

        return ResponseEntity.ok(response);
    }
}
