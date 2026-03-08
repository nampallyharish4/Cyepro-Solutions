package com.cyepro.engine.dto;

import java.time.OffsetDateTime;
import java.util.Map;

public class NotificationEventRequest {

    private String userId;
    private String eventType;
    private String title;
    private String message;
    private String source;
    private String priorityHint;
    private String channel;
    private Map<String, Object> metadata;
    private String dedupeKey;
    private OffsetDateTime expiresAt;

    // snake_case aliases for JSON compatibility with existing frontend
    public String getUser_id() { return userId; }
    public void setUser_id(String userId) { this.userId = userId; }

    public String getEvent_type() { return eventType; }
    public void setEvent_type(String eventType) { this.eventType = eventType; }

    public String getPriority_hint() { return priorityHint; }
    public void setPriority_hint(String priorityHint) { this.priorityHint = priorityHint; }

    public String getDedupe_key() { return dedupeKey; }
    public void setDedupe_key(String dedupeKey) { this.dedupeKey = dedupeKey; }

    public String getExpires_at() { return expiresAt != null ? expiresAt.toString() : null; }
    public void setExpires_at(String expiresAt) {
        if (expiresAt != null) this.expiresAt = OffsetDateTime.parse(expiresAt);
    }

    // camelCase getters/setters
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getPriorityHint() { return priorityHint; }
    public void setPriorityHint(String priorityHint) { this.priorityHint = priorityHint; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public String getDedupeKey() { return dedupeKey; }
    public void setDedupeKey(String dedupeKey) { this.dedupeKey = dedupeKey; }

    public OffsetDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(OffsetDateTime expiresAt) { this.expiresAt = expiresAt; }
}
