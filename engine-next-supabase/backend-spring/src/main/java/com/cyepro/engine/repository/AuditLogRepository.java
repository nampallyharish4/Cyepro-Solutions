package com.cyepro.engine.repository;

import com.cyepro.engine.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    long countByDecision(String decision);

    Page<AuditLog> findAllByOrderByProcessedAtDesc(Pageable pageable);

    List<AuditLog> findTop10ByOrderByProcessedAtDesc();

    List<AuditLog> findByProcessedAtAfterOrderByProcessedAtAsc(OffsetDateTime since);

    @Query("""
        SELECT COUNT(a) FROM AuditLog a
        WHERE a.decision = 'NOW'
          AND a.processedAt >= :since
          AND a.eventId IN (
            SELECT ne.id FROM NotificationEvent ne WHERE ne.userId = :userId
          )
        """)
    long countNowDecisionsForUserSince(@Param("userId") String userId, @Param("since") OffsetDateTime since);
}
