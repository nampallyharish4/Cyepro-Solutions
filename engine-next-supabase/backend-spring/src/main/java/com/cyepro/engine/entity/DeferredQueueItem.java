package com.cyepro.engine.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "deferred_queue")
public class DeferredQueueItem {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "event_id")
    private UUID eventId;

    @Column(name = "process_after", nullable = false)
    private OffsetDateTime processAfter;

    private String status = "WAITING";

    @Column(name = "retry_count")
    private Integer retryCount = 0;

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id", insertable = false, updatable = false)
    private NotificationEvent notificationEvent;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getEventId() { return eventId; }
    public void setEventId(UUID eventId) { this.eventId = eventId; }

    public OffsetDateTime getProcessAfter() { return processAfter; }
    public void setProcessAfter(OffsetDateTime processAfter) { this.processAfter = processAfter; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getRetryCount() { return retryCount; }
    public void setRetryCount(Integer retryCount) { this.retryCount = retryCount; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public NotificationEvent getNotificationEvent() { return notificationEvent; }
}
