package com.cyepro.engine.controller;

import com.cyepro.engine.dto.NotificationEventRequest;
import com.cyepro.engine.entity.AuditLog;
import com.cyepro.engine.entity.NotificationEvent;
import com.cyepro.engine.repository.AuditLogRepository;
import com.cyepro.engine.repository.DeferredQueueRepository;
import com.cyepro.engine.repository.NotificationEventRepository;
import com.cyepro.engine.service.DecisionEngine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api")
public class NotificationController {

    private final DecisionEngine decisionEngine;
    private final NotificationEventRepository eventRepo;
    private final AuditLogRepository auditRepo;
    private final DeferredQueueRepository deferredRepo;

    public NotificationController(DecisionEngine decisionEngine,
                                  NotificationEventRepository eventRepo,
                                  AuditLogRepository auditRepo,
                                  DeferredQueueRepository deferredRepo) {
        this.decisionEngine = decisionEngine;
        this.eventRepo = eventRepo;
        this.auditRepo = auditRepo;
        this.deferredRepo = deferredRepo;
    }

    /**
     * POST /api/notifications — Submit an event
     */
    @PostMapping("/notifications")
    public ResponseEntity<?> submitEvent(@RequestBody NotificationEventRequest request) {
        try {
            NotificationEvent event = new NotificationEvent();
            event.setUserId(request.getUserId() != null ? request.getUserId() : request.getUser_id());
            event.setEventType(request.getEventType() != null ? request.getEventType() : request.getEvent_type());
            event.setTitle(request.getTitle());
            event.setMessage(request.getMessage());
            event.setSource(request.getSource());
            event.setPriorityHint(request.getPriorityHint() != null ? request.getPriorityHint() : request.getPriority_hint());
            event.setChannel(request.getChannel());
            event.setMetadata(request.getMetadata());
            event.setDedupeKey(request.getDedupeKey() != null ? request.getDedupeKey() : request.getDedupe_key());
            event.setExpiresAt(request.getExpiresAt());

            NotificationEvent result = decisionEngine.processEvent(event);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("message", "Event accepted for processing");
            response.put("event_id", result.getId());
            response.put("status", "PENDING");

            return ResponseEntity.status(202).body(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Internal Server Error"));
        }
    }

    /**
     * GET /api/metrics — Dashboard live metrics
     */
    @GetMapping("/metrics")
    public ResponseEntity<?> getMetrics() {
        try {
            long total = eventRepo.count();
            long nowCount = auditRepo.countByDecision("NOW");
            long laterCount = auditRepo.countByDecision("LATER");
            long neverCount = auditRepo.countByDecision("NEVER");
            long sentCount = auditRepo.countByDecision("SENT");

            long queueWaiting = deferredRepo.countByStatus("WAITING");
            long queueFailed = deferredRepo.countByStatus("FAILED");
            long queueDeadLetter = deferredRepo.countByStatus("DEAD_LETTER");

            List<AuditLog> recent = auditRepo.findTop10ByOrderByProcessedAtDesc();

            // Build recent items with joined event data
            List<Map<String, Object>> recentList = new ArrayList<>();
            for (AuditLog log : recent) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", log.getId());
                item.put("event_id", log.getEventId());
                item.put("decision", log.getDecision());
                item.put("reason", log.getReason());
                item.put("ai_model", log.getAiModel());
                item.put("is_fallback", log.getIsFallback());
                item.put("processed_at", log.getProcessedAt());
                if (log.getNotificationEvent() != null) {
                    Map<String, Object> eventInfo = new LinkedHashMap<>();
                    eventInfo.put("title", log.getNotificationEvent().getTitle());
                    eventInfo.put("source", log.getNotificationEvent().getSource());
                    eventInfo.put("user_id", log.getNotificationEvent().getUserId());
                    item.put("notification_events", eventInfo);
                }
                recentList.add(item);
            }

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("total", total);
            response.put("now", nowCount);
            response.put("later", laterCount);
            response.put("never", neverCount);
            response.put("sent", sentCount);
            response.put("queue", Map.of(
                    "waiting", queueWaiting,
                    "failed", queueFailed,
                    "dead_letter", queueDeadLetter
            ));
            response.put("recent", recentList);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch metrics"));
        }
    }

    /**
     * GET /api/metrics/timeline — Hourly breakdown for last 24 hours
     */
    @GetMapping("/metrics/timeline")
    public ResponseEntity<?> getMetricsTimeline() {
        try {
            OffsetDateTime since = OffsetDateTime.now().minusHours(24);
            List<AuditLog> logs = auditRepo.findByProcessedAtAfterOrderByProcessedAtAsc(since);

            Map<String, Map<String, Object>> buckets = new LinkedHashMap<>();

            for (AuditLog log : logs) {
                if (log.getProcessedAt() == null) continue;
                String hourKey = log.getProcessedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:00"));

                buckets.computeIfAbsent(hourKey, k -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("hour", k);
                    m.put("now", 0);
                    m.put("later", 0);
                    m.put("never", 0);
                    return m;
                });

                Map<String, Object> bucket = buckets.get(hourKey);
                String d = log.getDecision() != null ? log.getDecision().toUpperCase() : "";
                switch (d) {
                    case "NOW" -> bucket.put("now", (int) bucket.get("now") + 1);
                    case "LATER" -> bucket.put("later", (int) bucket.get("later") + 1);
                    case "NEVER" -> bucket.put("never", (int) bucket.get("never") + 1);
                }
            }

            return ResponseEntity.ok(buckets.values());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch timeline metrics"));
        }
    }

    /**
     * GET /api/audit — Paginated audit logs
     */
    @GetMapping("/audit")
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "30") int limit) {
        try {
            page = Math.max(1, page);
            limit = Math.min(100, Math.max(1, limit));

            Page<AuditLog> result = auditRepo.findAllByOrderByProcessedAtDesc(
                    PageRequest.of(page - 1, limit));

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("data", result.getContent());
            response.put("total", result.getTotalElements());
            response.put("page", page);
            response.put("limit", limit);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Audit fetch failed"));
        }
    }
}
