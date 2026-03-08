package com.cyepro.engine.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AIService {

    private static final Logger log = LoggerFactory.getLogger(AIService.class);
    private static final Set<String> VALID_PRIORITIES = Set.of("NOW", "LATER", "NEVER");
    private static final Pattern JSON_PATTERN = Pattern.compile("\\{[\\s\\S]*\\}");

    @Value("${groq.api-key:}")
    private String groqApiKey;

    @Value("${groq.model:llama-3.3-70b-versatile}")
    private String groqModel;

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    @Value("${gemini.model:gemini-flash-latest}")
    private String geminiModelName;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Circuit breaker state
    private int circuitBreakerFailureCount = 0;
    private static final int FAILURE_THRESHOLD = 5;
    private Long lastFailureTime = null;
    private static final long CIRCUIT_OPEN_TIMEOUT = 5 * 60 * 1000; // 5 min

    private static final String SYSTEM_PROMPT = """
        You are a Notification Prioritization Engine. Classify each notification into exactly one category.

        Rules:
        - NOW: Critical security alerts, OTP/2FA codes, fraud detection, system outages, payment failures, unauthorized access. Anything requiring immediate human action.
        - LATER: Warnings (low balance, disk space), informational updates, daily digests, non-critical status changes. Can wait minutes or hours.
        - NEVER: Spam, promotional offers, gamification badges, social media likes, newsletters, marketing emails. No matter how "urgent" the language sounds.

        Important: Judge by actual content severity, NOT by urgent-sounding words like "CRITICAL", "URGENT", "LAST CHANCE" in promotional/marketing contexts.

        Return ONLY valid JSON: {"priority":"NOW"|"LATER"|"NEVER", "reason":"concise explanation", "confidence":0.0-1.0}""";

    public ClassificationResult classify(Map<String, Object> event) {
        if (isCircuitOpen()) {
            return fallBack("Circuit Breaker Active — AI paused for cooldown", 0.5, "fallback");
        }

        String modelName = (groqApiKey != null && !groqApiKey.isBlank()) ? groqModel : geminiModelName;

        String userContent = String.format("Title: %s\nMessage: %s\nType: %s\nSource: %s%s",
                event.getOrDefault("title", ""),
                event.getOrDefault("message", ""),
                event.getOrDefault("eventType", event.getOrDefault("event_type", "")),
                event.getOrDefault("source", ""),
                event.containsKey("priorityHint") || event.containsKey("priority_hint")
                        ? "\nHint: " + event.getOrDefault("priorityHint", event.getOrDefault("priority_hint", ""))
                        : "");

        try {
            if (groqApiKey != null && !groqApiKey.isBlank()) {
                return classifyWithGroq(userContent, modelName);
            }
            if (geminiApiKey != null && !geminiApiKey.isBlank()) {
                return classifyWithGemini(userContent);
            }
            // No API keys configured
            return fallBack("No AI API keys configured", 0.0, "fallback-engine");
        } catch (Exception e) {
            String detail = extractErrorDetail(e);
            log.error("AI Service Error [{}]: {}", modelName, detail);
            recordFailure();
            return fallBack(detail, 0.0, "fallback-engine");
        }
    }

    private ClassificationResult classifyWithGroq(String userContent, String modelName) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        Map<String, Object> body = Map.of(
                "model", modelName,
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", userContent)
                ),
                "response_format", Map.of("type", "json_object"),
                "temperature", 0.1,
                "max_tokens", 200
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.exchange(
                "https://api.groq.com/openai/v1/chat/completions",
                HttpMethod.POST, request, String.class);

        JsonNode root = safeParseJSON(response.getBody());
        String content = root.path("choices").path(0).path("message").path("content").asText();
        JsonNode parsed = safeParseJSON(content);

        if (parsed == null || parsed.isMissingNode()) {
            throw new RuntimeException("Groq returned malformed JSON");
        }

        resetCircuit();
        return new ClassificationResult(
                normalizePriority(parsed.path("priority").asText()),
                truncate(parsed.path("reason").asText("Groq analysis complete"), 500),
                clampConfidence(parsed.path("confidence").asDouble(0.85)),
                false,
                modelName
        );
    }

    private ClassificationResult classifyWithGemini(String userContent) {
        String url = String.format(
                "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                geminiModelName, geminiApiKey);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", SYSTEM_PROMPT + "\n\nInput:\n" + userContent))
                )),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "maxOutputTokens", 200,
                        "temperature", 0.1,
                        "topP", 0.1
                )
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, request, String.class);

        JsonNode root = safeParseJSON(response.getBody());
        String text = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText();
        JsonNode parsed = safeParseJSON(text);

        if (parsed == null || parsed.isMissingNode()) {
            throw new RuntimeException("Gemini returned malformed JSON");
        }

        resetCircuit();
        return new ClassificationResult(
                normalizePriority(parsed.path("priority").asText()),
                truncate(parsed.path("reason").asText("Gemini analysis complete"), 500),
                clampConfidence(parsed.path("confidence").asDouble(0.8)),
                false,
                geminiModelName
        );
    }

    public Map<String, Object> getStatus() {
        return Map.of(
                "circuitBreaker", isCircuitOpen() ? "OPEN" : "CLOSED",
                "failureCount", circuitBreakerFailureCount,
                "lastFailure", lastFailureTime != null ? lastFailureTime : "null"
        );
    }

    private boolean isCircuitOpen() {
        if (circuitBreakerFailureCount >= FAILURE_THRESHOLD) {
            long now = System.currentTimeMillis();
            if (lastFailureTime != null && now - lastFailureTime < CIRCUIT_OPEN_TIMEOUT) {
                return true;
            }
            resetCircuit();
        }
        return false;
    }

    private synchronized void recordFailure() {
        circuitBreakerFailureCount++;
        lastFailureTime = System.currentTimeMillis();
    }

    private synchronized void resetCircuit() {
        circuitBreakerFailureCount = 0;
        lastFailureTime = null;
    }

    private ClassificationResult fallBack(String errorReason, double confidence, String model) {
        return new ClassificationResult(
                "LATER",
                "Safe Fallback: " + errorReason,
                confidence,
                true,
                model
        );
    }

    private String normalizePriority(String raw) {
        String upper = (raw != null ? raw : "").toUpperCase().trim();
        return VALID_PRIORITIES.contains(upper) ? upper : "LATER";
    }

    private JsonNode safeParseJSON(String text) {
        if (text == null) return objectMapper.missingNode();
        try {
            return objectMapper.readTree(text);
        } catch (Exception e) {
            Matcher m = JSON_PATTERN.matcher(text);
            if (m.find()) {
                try {
                    return objectMapper.readTree(m.group());
                } catch (Exception ignored) {}
            }
            return objectMapper.missingNode();
        }
    }

    private double clampConfidence(double v) {
        return Math.min(1.0, Math.max(0.0, v));
    }

    private String truncate(String s, int max) {
        return s != null && s.length() > max ? s.substring(0, max) : (s != null ? s : "");
    }

    private String extractErrorDetail(Exception e) {
        String msg = e.getMessage();
        if (msg != null) {
            if (msg.contains("401")) return "Authorization Error (Invalid API Key)";
            if (msg.contains("403")) return "Forbidden (API Key lacks permissions)";
            if (msg.contains("404")) return "Model Not Found";
            if (msg.contains("429")) return "Rate Limited (Quota Exceeded)";
            if (msg.contains("503")) return "Service Unavailable";
        }
        return msg != null ? msg : "AI Analysis unreachable";
    }

    public record ClassificationResult(
            String priority,
            String reason,
            double confidence,
            boolean isFallback,
            String modelName
    ) {}
}
