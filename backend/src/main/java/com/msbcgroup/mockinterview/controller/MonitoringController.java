package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.model.MonitoringEvent;
import com.msbcgroup.mockinterview.repository.MonitoringEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/monitoring")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class MonitoringController {

    @Autowired
    private MonitoringEventRepository eventRepository;

    @PostMapping("/log-event")
    public ResponseEntity<String> logEvent(@RequestBody Map<String, Object> eventData) {
        MonitoringEvent event = new MonitoringEvent();
        event.setSessionId((String) eventData.get("sessionId"));
        event.setCandidateEmail((String) eventData.get("candidateEmail"));
        event.setEventType(MonitoringEvent.EventType.valueOf((String) eventData.get("eventType")));
        event.setDescription((String) eventData.get("description"));
        event.setMetadata((String) eventData.get("metadata"));

        eventRepository.save(event);
        return ResponseEntity.ok("Event logged");
    }

    @GetMapping("/events/{sessionId}")
    public ResponseEntity<List<MonitoringEvent>> getSessionEvents(@PathVariable String sessionId) {
        List<MonitoringEvent> events = eventRepository.findBySessionIdOrderByTimestampDesc(sessionId);
        return ResponseEntity.ok(events);
    }
}
