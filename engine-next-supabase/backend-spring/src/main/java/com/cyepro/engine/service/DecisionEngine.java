package com.cyepro.engine.service;

import com.cyepro.engine.entity.*;
import com.cyepro.engine.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class DecisionEngine {

    private static final Logger log = LoggerFactory.getLogger(DecisionEngine.class);

    private final NotificationEventRepository eventRepo;
    private final RuleRepository ruleRepo;
    private final AuditLogRepository auditRepo;
    private final DeferredQueueRepository deferredRepo;
    private final AIService aiService;

    public DecisionEngine(NotificationEventRepository eventRepo,
                          RuleRepository ruleRepo,
                          AuditLogRepository auditRepo,
                          DeferredQueueRepository deferredRepo,
                          AIService aiService) {
        this.eventRepo = eventRepo;
        this.ruleRepo = ruleRepo;
        this.auditRepo = auditRepo;
        this.deferredRepo = deferredRepo;
        this.aiService = aiService;
    }

    /**
     * Main entry point for a new event.
     * Saves the event, kicks off async pipeline, and returns immediately.
     */
    public NotificationEvent processEvent(NotificationEvent event) {
        event.setStatus("PENDING");
        event.setReceivedAt(OffsetDateTime.now());
        NotificationEvent saved = eventRepo.save(event);

        // Async pipeline
        executeEnginePipeline(saved.getId(), saved.getUserId());

        return saved;
    }

    @Async
    public void executeEnginePipeline(UUID eventId, String userId) {
        try {
            Optional<NotificationEvent> optEvent = eventRepo.findById(eventId);
            if (optEvent.isEmpty()) return;
            NotificationEvent event = optEvent.get();

            // 0. Expiry Check
            if (event.getExpiresAt() != null && event.getExpiresAt().isBefore(OffsetDateTime.now())) {
                finalizeDecision(eventId, "NEVER", "Event expired before processing (expires_at in the past)",
                        null, false, null, null, false);
                return;
            }

            // 1. Exact Deduplication
            if (event.getDedupeKey() != null && !event.getDedupeKey().isBlank()) {
                List<NotificationEvent> existing = eventRepo.findByDedupeKeyAndIdNot(event.getDedupeKey(), eventId);
                if (!existing.isEmpty()) {
                    finalizeDecision(eventId, "NEVER", "Duplicate event (Matched dedupe_key)",
                            null, false, null, null, false);
                    return;
                }
            }

            // 2. Near-duplicate detection (pg_trgm similarity)
            List<Object[]> nearDups = eventRepo.findNearDuplicates(event.getUserId(), event.getTitle(), 0.8);
            List<Object[]> filteredDups = nearDups.stream()
                    .filter(row -> !((UUID) row[0]).equals(eventId))
                    .toList();

            if (!filteredDups.isEmpty()) {
                double similarity = ((Number) filteredDups.get(0)[1]).doubleValue();
                finalizeDecision(eventId, "NEVER",
                        String.format("Near-duplicate detected (Similarity: %.2f)", similarity),
                        null, false, null, null, false);
                return;
            }

            // 3. Rule Evaluation — deterministic rules before AI
            List<Rule> rules = ruleRepo.findByIsActiveTrueAndConditionTypeNotOrderByPriorityOrderDesc("system_setting");
            for (Rule rule : rules) {
                if (evaluateRule(event, rule)) {
                    finalizeDecision(eventId, rule.getTargetPriority(),
                            "Rule matched: " + rule.getName(),
                            rule.getId(), false, null, null, false);
                    return;
                }
            }

            // 4. Fatigue Check
            if (isFatigued(event.getUserId())) {
                finalizeDecision(eventId, "LATER",
                        "Alert Fatigue: User reached notification limit in current window.",
                        null, false, null, null, false);
                return;
            }

            // 5. AI Classification
            runAIClassification(event);

        } catch (Exception e) {
            log.error("Pipeline Error:", e);
            finalizeDecision(eventId, "LATER",
                    "Internal Error: Processing failed, defaulted to LATER",
                    null, false, null, null, false);
        }
    }

    private boolean evaluateRule(NotificationEvent event, Rule rule) {
        return switch (rule.getConditionType()) {
            case "source" -> event.getSource() != null && event.getSource().equals(rule.getConditionValue());
            case "type" -> event.getEventType() != null && event.getEventType().equals(rule.getConditionValue());
            case "title_contains" -> event.getTitle() != null &&
                    event.getTitle().toLowerCase().contains(rule.getConditionValue().toLowerCase());
            case "metadata_match" -> {
                String[] parts = rule.getConditionValue().split("=", 2);
                if (parts.length != 2) yield false;
                Map<String, Object> meta = event.getMetadata();
                if (meta == null) yield false;
                Object val = meta.get(parts[0]);
                yield val != null && String.valueOf(val).equalsIgnoreCase(parts[1]);
            }
            default -> false;
        };
    }

    private boolean isFatigued(String userId) {
        int windowMinutes = 60;
        int maxNotifications = 5;

        Optional<Rule> fatigueRule = ruleRepo.findFirstByNameAndIsActiveTrueOrderByCreatedAtDesc("FATIGUE_LIMIT");
        if (fatigueRule.isPresent()) {
            try {
                maxNotifications = Integer.parseInt(fatigueRule.get().getConditionValue());
            } catch (NumberFormatException ignored) {}
        }

        OffsetDateTime since = OffsetDateTime.now().minusMinutes(windowMinutes);
        long count = auditRepo.countNowDecisionsForUserSince(userId, since);
        return count >= maxNotifications;
    }

    private void runAIClassification(NotificationEvent event) {
        try {
            Map<String, Object> eventMap = Map.of(
                    "title", event.getTitle() != null ? event.getTitle() : "",
                    "message", event.getMessage() != null ? event.getMessage() : "",
                    "event_type", event.getEventType() != null ? event.getEventType() : "",
                    "source", event.getSource() != null ? event.getSource() : "",
                    "priority_hint", event.getPriorityHint() != null ? event.getPriorityHint() : ""
            );

            AIService.ClassificationResult result = aiService.classify(eventMap);
            finalizeDecision(event.getId(), result.priority(), result.reason(),
                    null, true, result.modelName(), result.confidence(), result.isFallback());
        } catch (Exception e) {
            finalizeDecision(event.getId(), "LATER", "AI Unresponsive: Fallback to LATER",
                    null, true, "fallback-engine", 0.0, true);
        }
    }

    private void finalizeDecision(UUID eventId, String decision, String reason,
                                  UUID ruleId, boolean aiUsed, String aiModel,
                                  Double aiConfidence, boolean isFallback) {
        // 1. Audit log (append-only)
        AuditLog auditLog = new AuditLog();
        auditLog.setEventId(eventId);
        auditLog.setDecision(decision);
        auditLog.setReason(reason);
        auditLog.setRuleId(ruleId);
        auditLog.setAiUsed(aiUsed);
        auditLog.setAiModel(aiModel);
        auditLog.setAiConfidence(aiConfidence);
        auditLog.setIsFallback(isFallback);
        auditLog.setProcessedAt(OffsetDateTime.now());
        auditRepo.save(auditLog);

        // 2. Update event status
        eventRepo.findById(eventId).ifPresent(ev -> {
            ev.setStatus("PROCESSED");
            eventRepo.save(ev);
        });

        // 3. Handle LATER queue
        if ("LATER".equals(decision)) {
            DeferredQueueItem item = new DeferredQueueItem();
            item.setEventId(eventId);
            item.setProcessAfter(OffsetDateTime.now().plusMinutes(30));
            item.setStatus("WAITING");
            item.setRetryCount(0);
            deferredRepo.save(item);
        }

        log.info("Decision for {}: {} - {}", eventId, decision, reason);
    }
}
