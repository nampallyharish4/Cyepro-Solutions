package com.cyepro.engine.repository;

import com.cyepro.engine.entity.Rule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RuleRepository extends JpaRepository<Rule, UUID> {

    List<Rule> findByIsActiveTrueOrderByPriorityOrderDesc();

    List<Rule> findByIsActiveTrueAndConditionTypeNotOrderByPriorityOrderDesc(String conditionType);

    Optional<Rule> findFirstByNameAndIsActiveTrueOrderByCreatedAtDesc(String name);

    Optional<Rule> findByIdAndIsActiveTrue(UUID id);
}
