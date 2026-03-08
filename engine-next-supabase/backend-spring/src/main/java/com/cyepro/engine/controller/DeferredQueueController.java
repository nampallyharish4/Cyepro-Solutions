package com.cyepro.engine.controller;

import com.cyepro.engine.entity.AuditLog;
import com.cyepro.engine.entity.DeferredQueueItem;
import com.cyepro.engine.repository.AuditLogRepository;
import com.cyepro.engine.repository.DeferredQueueRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/deferred-queue")
public class DeferredQueueController {

    private final DeferredQueueRepository deferredRepo;
    private final AuditLogRepository auditRepo;

    public DeferredQueueController(DeferredQueueRepository deferredRepo, AuditLogRepository auditRepo) {
        this.deferredRepo = deferredRepo;
        this.auditRepo = auditRepo;
    }

    @GetMapping
    public ResponseEntity<?> getDeferredQueue(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "30") int limit,
            @RequestParam(required = false) String status) {
        try {
            page = Math.max(1, page);
            limit = Math.min(100, Math.max(1, limit));

            Page<DeferredQueueItem> result;
            if (status != null && !status.isEmpty() && !"ALL".equalsIgnoreCase(status)) {
                result = deferredRepo.findByStatusOrderByCreatedAtDesc(status, PageRequest.of(page - 1, limit));
            } else {
                result = deferredRepo.findAllByOrderByCreatedAtDesc(PageRequest.of(page - 1, limit));
            }

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("data", result.getContent());
            response.put("total", result.getTotalElements());
            response.put("page", page);
            response.put("limit", limit);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Deferred queue fetch failed"));
        }
    }

    @PostMapping("/{id}/force-send")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> forceSendDeferred(@PathVariable UUID id) {
        try {
            // Optimistic concurrency — only update if WAITING or FAILED
            int updated = deferredRepo.updateStatusIfCurrent(id, "SENT", List.of("WAITING", "FAILED"));
            if (updated == 0) {
                return ResponseEntity.status(409)
                        .body(Map.of("error", "Item already processed or not found"));
            }

            DeferredQueueItem item = deferredRepo.findById(id).orElse(null);
            if (item == null) {
                return ResponseEntity.status(409)
                        .body(Map.of("error", "Item not found"));
            }

            // Audit log
            AuditLog auditLog = new AuditLog();
            auditLog.setEventId(item.getEventId());
            auditLog.setDecision("SENT");
            auditLog.setReason("Manually force-sent by admin from deferred queue.");
            auditLog.setIsFallback(false);
            auditLog.setProcessedAt(OffsetDateTime.now());
            auditRepo.save(auditLog);

            return ResponseEntity.ok(Map.of("message", "Item force-sent successfully", "data", item));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Force send failed"));
        }
    }
}
