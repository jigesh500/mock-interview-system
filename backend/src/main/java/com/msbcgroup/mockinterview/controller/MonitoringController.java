package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.model.MonitoringEvent;
import com.msbcgroup.mockinterview.repository.MonitoringEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/monitoring")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class MonitoringController {

    @Autowired
    private MonitoringEventRepository eventRepository;

    /**
     * Log a monitoring event from frontend
     */
    @PostMapping("/log-event")
    public ResponseEntity<String> logEvent(@RequestBody Map<String, Object> eventData) {
        try {
            MonitoringEvent event = new MonitoringEvent();

            // Required fields
            event.setSessionId((String) eventData.get("sessionId"));
            event.setCandidateEmail((String) eventData.get("candidateEmail"));
            event.setDescription((String) eventData.getOrDefault("description", ""));
            event.setMetadata((String) eventData.getOrDefault("metadata", ""));

            // Validate and set EventType
            String typeStr = (String) eventData.get("eventType");
            try {
                event.setEventType(MonitoringEvent.EventType.valueOf(typeStr));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body("Invalid eventType: " + typeStr);
            }

            // Timestamp is automatically set in constructor
            eventRepository.save(event);

            return ResponseEntity.ok("Event logged successfully");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error logging event: " + e.getMessage());
        }
    }

    /**
     * Fetch all monitoring events for a given session
     */
    @GetMapping("/events/{sessionId}")
    public ResponseEntity<List<MonitoringEvent>> getSessionEvents(@PathVariable String sessionId) {
        List<MonitoringEvent> events = eventRepository.findBySessionIdOrderByTimestampDesc(sessionId);
        return ResponseEntity.ok(events);
    }
}
