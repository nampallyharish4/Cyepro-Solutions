package com.cyepro.engine.repository;

import com.cyepro.engine.entity.DeferredQueueItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeferredQueueRepository extends JpaRepository<DeferredQueueItem, UUID> {

    long countByStatus(String status);

    Page<DeferredQueueItem> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<DeferredQueueItem> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    List<DeferredQueueItem> findByStatusAndProcessAfterLessThanEqual(String status, OffsetDateTime now);

    List<DeferredQueueItem> findByStatusAndRetryCountLessThan(String status, int maxRetries);

    @Modifying
    @Query("UPDATE DeferredQueueItem d SET d.status = :newStatus WHERE d.id = :id AND d.status IN :currentStatuses")
    int updateStatusIfCurrent(@Param("id") UUID id,
                              @Param("newStatus") String newStatus,
                              @Param("currentStatuses") List<String> currentStatuses);

    Optional<DeferredQueueItem> findByIdAndStatusIn(UUID id, List<String> statuses);
}
