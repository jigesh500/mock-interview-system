package com.msbcgroup.mockinterview.service;

import com.msbcgroup.mockinterview.model.MonitoringEvent;
import com.msbcgroup.mockinterview.repository.MonitoringEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class MonitoringService {

    @Autowired
    private MonitoringEventRepository eventRepository;

    public void logEvent(Map<String, Object> eventData) {
        MonitoringEvent event = new MonitoringEvent();
        
        event.setSessionId((String) eventData.get("sessionId"));
        event.setCandidateEmail((String) eventData.get("candidateEmail"));
        event.setDescription((String) eventData.getOrDefault("description", ""));
        event.setMetadata((String) eventData.getOrDefault("metadata", ""));

        String typeStr = (String) eventData.get("eventType");
        try {
            event.setEventType(MonitoringEvent.EventType.valueOf(typeStr));
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid eventType: " + typeStr);
        }

        eventRepository.save(event);
    }
}