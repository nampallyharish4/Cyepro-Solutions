package com.cyepro.engine.service;

import com.cyepro.engine.entity.AuditLog;
import com.cyepro.engine.entity.DeferredQueueItem;
import com.cyepro.engine.repository.AuditLogRepository;
import com.cyepro.engine.repository.DeferredQueueRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class SchedulerService {

    private static final Logger log = LoggerFactory.getLogger(SchedulerService.class);
    private static final int MAX_RETRIES = 3;

    private volatile boolean isRunning = false;

    private final DeferredQueueRepository deferredRepo;
    private final AuditLogRepository auditRepo;

    public SchedulerService(DeferredQueueRepository deferredRepo, AuditLogRepository auditRepo) {
        this.deferredRepo = deferredRepo;
        this.auditRepo = auditRepo;
        log.info("Scheduler Service Started: Checking LATER queue every 1 minute.");
    }

    @Scheduled(fixedRate = 60_000) // Every 1 minute
    public void processLaterQueue() {
        if (isRunning) return;
        isRunning = true;

        try {
            OffsetDateTime now = OffsetDateTime.now();

            // 1. WAITING items ready to process
            List<DeferredQueueItem> waitingItems = deferredRepo
                    .findByStatusAndProcessAfterLessThanEqual("WAITING", now);

            // 2. FAILED items with retries remaining
            List<DeferredQueueItem> failedItems = deferredRepo
                    .findByStatusAndRetryCountLessThan("FAILED", MAX_RETRIES);

            List<DeferredQueueItem> allItems = new ArrayList<>(waitingItems);
            // Limit failed items to 5
            allItems.addAll(failedItems.stream().limit(5).toList());
            // Limit waiting items to first 10 only
            if (waitingItems.size() > 10) {
                allItems = new ArrayList<>(waitingItems.subList(0, 10));
                allItems.addAll(failedItems.stream().limit(5).toList());
            }

            if (allItems.isEmpty()) return;

            log.info("Processing {} items from LATER queue...", allItems.size());

            for (DeferredQueueItem item : allItems) {
                handleQueueItem(item);
            }
        } catch (Exception e) {
            log.error("Scheduler Error:", e);
        } finally {
            isRunning = false;
        }
    }

    private void handleQueueItem(DeferredQueueItem item) {
        try {
            // Optimistic concurrency guard
            int updated = deferredRepo.updateStatusIfCurrent(
                    item.getId(), "PROCESSING", List.of("WAITING", "FAILED"));
            if (updated == 0) return; // Already claimed by another instance

            // Mark as SENT
            item.setStatus("SENT");
            deferredRepo.save(item);

            // Audit log
            AuditLog auditLog = new AuditLog();
            auditLog.setEventId(item.getEventId());
            auditLog.setDecision("SENT");
            auditLog.setReason("Deferred notification sent after LATER period.");
            auditLog.setIsFallback(false);
            auditLog.setProcessedAt(OffsetDateTime.now());
            auditRepo.save(auditLog);

        } catch (Exception e) {
            log.error("Failed to process queue item {}: {}", item.getId(), e.getMessage());
            int newRetryCount = (item.getRetryCount() != null ? item.getRetryCount() : 0) + 1;

            if (newRetryCount >= MAX_RETRIES) {
                // Dead letter
                item.setStatus("DEAD_LETTER");
                item.setRetryCount(newRetryCount);
                deferredRepo.save(item);

                AuditLog auditLog = new AuditLog();
                auditLog.setEventId(item.getEventId());
                auditLog.setDecision("FAILED");
                auditLog.setReason(String.format("Deferred item exhausted %d retries, moved to dead letter.", MAX_RETRIES));
                auditLog.setIsFallback(false);
                auditLog.setProcessedAt(OffsetDateTime.now());
                auditRepo.save(auditLog);
            } else {
                // Mark FAILED for retry
                item.setStatus("FAILED");
                item.setRetryCount(newRetryCount);
                deferredRepo.save(item);
            }
        }
    }
}
