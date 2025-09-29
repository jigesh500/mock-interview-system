package com.msbcgroup.mockinterview.repository;

import com.msbcgroup.mockinterview.model.MonitoringEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MonitoringEventRepository extends JpaRepository<MonitoringEvent, Long> {
    List<MonitoringEvent> findBySessionIdOrderByTimestampDesc(String sessionId);
    List<MonitoringEvent> findByCandidateEmailOrderByTimestampDesc(String candidateEmail);
    List<MonitoringEvent> findBySessionIdAndEventType(String sessionId, MonitoringEvent.EventType eventType);
}