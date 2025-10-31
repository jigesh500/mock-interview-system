package com.msbcgroup.mockinterview.service;

import com.msbcgroup.mockinterview.model.InterviewSession;
import com.msbcgroup.mockinterview.model.MonitoringEvent;
import com.msbcgroup.mockinterview.repository.InterviewSessionRepository;
import com.msbcgroup.mockinterview.repository.MonitoringEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class MonitoringService {

    @Autowired
    private MonitoringEventRepository eventRepository;

    @Autowired
    private InterviewSessionRepository sessionRepository;

    public void logEvent(Map<String, Object> eventData) {
        MonitoringEvent event = new MonitoringEvent();

        event.setSessionId((String) eventData.get("sessionId"));

        String candidateEmail = (String) eventData.get("candidateEmail");
        if (candidateEmail == null || candidateEmail.isEmpty()) {
            candidateEmail = "unknown@interview.com";
        }
        event.setCandidateEmail(candidateEmail);

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

    public void logEventWithSession(Map<String, Object> eventData) {
        String sessionId = (String) eventData.get("sessionId");

        if (sessionId != null && !sessionId.isEmpty()) {
            InterviewSession session = sessionRepository.findBySessionId(sessionId).orElse(null);
            if (session != null && session.getCandidateEmail() != null) {
                eventData.put("candidateEmail", session.getCandidateEmail());
            }
        }

        logEvent(eventData);
    }

    public Map<String, String> getCandidateBySession(String sessionId) {
        InterviewSession session = sessionRepository.findBySessionId(sessionId).orElse(null);
        Map<String, String> response = new HashMap<>();

        if (session != null) {
            response.put("candidateEmail", session.getCandidateEmail());
            response.put("sessionId", sessionId);
        } else {
            response.put("error", "Session not found");
        }

        return response;
    }
}