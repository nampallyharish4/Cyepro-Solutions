package com.cyepro.engine.controller;

import com.cyepro.engine.entity.Rule;
import com.cyepro.engine.repository.RuleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/rules")
public class RuleController {

    private final RuleRepository ruleRepository;

    public RuleController(RuleRepository ruleRepository) {
        this.ruleRepository = ruleRepository;
    }

    @GetMapping
    public ResponseEntity<List<Rule>> getRules() {
        List<Rule> rules = ruleRepository.findByIsActiveTrueOrderByPriorityOrderDesc();
        return ResponseEntity.ok(rules);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createRule(@RequestBody Rule rule) {
        try {
            rule.setCreatedAt(OffsetDateTime.now());
            rule.setUpdatedAt(OffsetDateTime.now());
            if (rule.getIsActive() == null) rule.setIsActive(true);
            Rule saved = ruleRepository.save(rule);
            return ResponseEntity.status(201).body(saved);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateRule(@PathVariable UUID id, @RequestBody Rule updates) {
        Optional<Rule> opt = ruleRepository.findByIdAndIsActiveTrue(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Rule not found or already deleted"));
        }

        Rule rule = opt.get();
        if (updates.getName() != null) rule.setName(updates.getName());
        if (updates.getConditionType() != null) rule.setConditionType(updates.getConditionType());
        if (updates.getConditionValue() != null) rule.setConditionValue(updates.getConditionValue());
        if (updates.getTargetPriority() != null) rule.setTargetPriority(updates.getTargetPriority());
        if (updates.getPriorityOrder() != null) rule.setPriorityOrder(updates.getPriorityOrder());
        rule.setUpdatedAt(OffsetDateTime.now());

        Rule saved = ruleRepository.save(rule);
        return ResponseEntity.ok(saved);
    }

    /**
     * Soft-delete — "Deleted data must be recoverable"
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteRule(@PathVariable UUID id) {
        Optional<Rule> opt = ruleRepository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(500).body(Map.of("error", "Rule not found"));
        }

        Rule rule = opt.get();
        rule.setIsActive(false);
        rule.setUpdatedAt(OffsetDateTime.now());
        Rule saved = ruleRepository.save(rule);
        return ResponseEntity.ok(saved);
    }
}
