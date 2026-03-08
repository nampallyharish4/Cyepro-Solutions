package com.cyepro.engine.repository;

import com.cyepro.engine.entity.NotificationEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface NotificationEventRepository extends JpaRepository<NotificationEvent, UUID> {

    List<NotificationEvent> findByDedupeKeyAndIdNot(String dedupeKey, UUID excludeId);

    @Query(value = """
        SELECT ne.id, similarity(ne.title, :title)::FLOAT as similarity
        FROM notification_events ne
        WHERE ne.user_id = :userId
          AND ne.status = 'PROCESSED'
          AND ne.received_at > now() - interval '24 hours'
          AND similarity(ne.title, :title) > :threshold
        ORDER BY similarity DESC
        LIMIT 1
        """, nativeQuery = true)
    List<Object[]> findNearDuplicates(
            @Param("userId") String userId,
            @Param("title") String title,
            @Param("threshold") double threshold);
}
