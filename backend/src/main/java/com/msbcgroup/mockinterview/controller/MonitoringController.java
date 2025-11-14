package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.service.MonitoringService;
import com.msbcgroup.mockinterview.model.InterviewSession;
import com.msbcgroup.mockinterview.repository.InterviewSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/monitoring")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class MonitoringController {

    @Autowired
    private MonitoringService monitoringService;

    @Autowired
    private InterviewSessionRepository sessionRepository;

    @PostMapping("/log-event")
    public ResponseEntity<String> logEvent(@RequestBody Map<String, Object> eventData) {
        try {
            monitoringService.logEventWithSession(eventData);
            return ResponseEntity.ok("Event logged successfully");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error logging event: " + e.getMessage());
        }
    }
    
    @PostMapping("/batch-log-events")
    public ResponseEntity<String> logBatchEvents(@RequestBody Map<String, Object> batchData) {
        try {
            @SuppressWarnings("unchecked")
            java.util.List<Map<String, Object>> events = (java.util.List<Map<String, Object>>) batchData.get("events");
            
            if (events == null || events.isEmpty()) {
                return ResponseEntity.badRequest().body("No events provided");
            }
            
            monitoringService.logBatchEvents(events);
            return ResponseEntity.ok("Batch events logged successfully: " + events.size() + " events");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error logging batch events: " + e.getMessage());
        }
    }

    @GetMapping("/session/{sessionId}/candidate")
    public ResponseEntity<Map<String, String>> getCandidateBySession(@PathVariable String sessionId) {
        try {
            Map<String, String> response = monitoringService.getCandidateBySession(sessionId);
            return response.containsKey("error") ?
                    ResponseEntity.notFound().build() :
                    ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

}