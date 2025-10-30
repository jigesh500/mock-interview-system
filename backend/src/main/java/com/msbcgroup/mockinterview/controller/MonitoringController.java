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
