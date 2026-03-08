package com.cyepro.engine.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "event_id")
    private UUID eventId;

    @Column(nullable = false)
    private String decision;

    @Column(nullable = false)
    private String reason;

    @Column(name = "rule_id")
    private UUID ruleId;

    @Column(name = "ai_used")
    private Boolean aiUsed = false;

    @Column(name = "ai_model")
    private String aiModel;

    @Column(name = "ai_confidence")
    private Double aiConfidence;

    @Column(name = "is_fallback")
    private Boolean isFallback = false;

    @Column(name = "processed_at")
    private OffsetDateTime processedAt = OffsetDateTime.now();

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", insertable = false, updatable = false)
    private NotificationEvent notificationEvent;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "rule_id", insertable = false, updatable = false)
    private Rule rule;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getEventId() { return eventId; }
    public void setEventId(UUID eventId) { this.eventId = eventId; }

    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public UUID getRuleId() { return ruleId; }
    public void setRuleId(UUID ruleId) { this.ruleId = ruleId; }

    public Boolean getAiUsed() { return aiUsed; }
    public void setAiUsed(Boolean aiUsed) { this.aiUsed = aiUsed; }

    public String getAiModel() { return aiModel; }
    public void setAiModel(String aiModel) { this.aiModel = aiModel; }

    public Double getAiConfidence() { return aiConfidence; }
    public void setAiConfidence(Double aiConfidence) { this.aiConfidence = aiConfidence; }

    public Boolean getIsFallback() { return isFallback; }
    public void setIsFallback(Boolean isFallback) { this.isFallback = isFallback; }

    public OffsetDateTime getProcessedAt() { return processedAt; }
    public void setProcessedAt(OffsetDateTime processedAt) { this.processedAt = processedAt; }

    public NotificationEvent getNotificationEvent() { return notificationEvent; }

    public Rule getRule() { return rule; }
}
