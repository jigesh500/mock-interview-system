package com.msbcgroup.mockinterview.repository;

import com.msbcgroup.mockinterview.model.EventType;
import com.msbcgroup.mockinterview.model.MonitoringEvent;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MonitoringEventRepository extends JpaRepository<MonitoringEvent, Long> {
    List<MonitoringEvent> findBySessionIdOrderByTimestampDesc(String sessionId);
    List<MonitoringEvent> findByCandidateEmailOrderByTimestampDesc(String candidateEmail);
    List<MonitoringEvent> findBySessionIdAndEventType(String sessionId, MonitoringEvent.EventType eventType);
    List<MonitoringEvent> findByTimestampAfterOrderByTimestampDesc(LocalDateTime timestamp);
    @Query("SELECT e.eventType FROM MonitoringEvent e WHERE e.sessionId = :sessionId")
    List<MonitoringEvent.EventType> findEventTypesBySessionId(@Param("sessionId") String sessionId);

    // Fetch full event objects for a session
    @Query("SELECT e FROM MonitoringEvent e WHERE e.sessionId = :sessionId ORDER BY e.timestamp ASC")
    List<MonitoringEvent> findAllEventsBySessionId(@Param("sessionId") String sessionId);
    // Custom query for recent events by session
    default List<MonitoringEvent> findRecentEventsBySession(LocalDateTime since) {
        return findByTimestampAfterOrderByTimestampDesc(since);
    }
}