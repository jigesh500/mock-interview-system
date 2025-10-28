//package com.msbcgroup.mockinterview.controller;
//
//import com.msbcgroup.mockinterview.model.MonitoringEvent;
//import com.msbcgroup.mockinterview.repository.MonitoringEventRepository;
//import com.msbcgroup.mockinterview.service.VoiceVerificationService; // NEW IMPORT
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.*;
//import org.springframework.web.multipart.MultipartFile; // NEW IMPORT
//
//import java.time.LocalDateTime;
//import java.util.List;
//import java.util.Map;
//import java.util.HashMap;
//import java.util.stream.Collectors;
//
//@RestController
//@RequestMapping("/api/monitoring")
//@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
//public class MonitoringController2 {
//
//    @Autowired
//    private MonitoringEventRepository eventRepository;
//
//    @Autowired
//    private VoiceVerificationService voiceVerificationService; // NEW SERVICE
//
//    /**
//     * Log a monitoring event from frontend
//     */
//    @PostMapping("/log-event")
//    public ResponseEntity<String> logEvent(@RequestBody Map<String, Object> eventData) {
//        try {
//            System.out.println("Received log-event request: " + eventData);
//            MonitoringEvent event = new MonitoringEvent();
//
//            event.setSessionId((String) eventData.get("sessionId"));
//            event.setCandidateEmail((String) eventData.get("candidateEmail"));
//            event.setDescription((String) eventData.getOrDefault("description", ""));
//            event.setMetadata((String) eventData.getOrDefault("metadata", ""));
//
//            String typeStr = (String) eventData.get("eventType");
//            try {
//                event.setEventType(MonitoringEvent.EventType.valueOf(typeStr));
//            } catch (IllegalArgumentException e) {
//                return ResponseEntity.badRequest().body("Invalid eventType: " + typeStr);
//            }
//
//            eventRepository.save(event);
//
//            if ("INTERVIEW_END".equals(typeStr)) {
//                List<MonitoringEvent> allEvents = eventRepository.findAllEventsBySessionId(event.getSessionId());
//            }
//
//            return ResponseEntity.ok("Event logged successfully");
//        } catch (Exception e) {
//            e.printStackTrace();
//            return ResponseEntity.status(500).body("Error logging event: " + e.getMessage());
//        }
//    }
//
//    // --- NEW ENDPOINTS FOR VOICE VERIFICATION ---
//
//    /**
//     * Endpoint for voice enrollment.
//     */
//    @PostMapping("/voice-enroll")
//    public ResponseEntity<String> enrollVoice(@RequestParam("audio") MultipartFile audioFile, @RequestParam("sessionId") String sessionId) {
//        try {
//            voiceVerificationService.enrollSpeaker(sessionId, audioFile);
//
//            MonitoringEvent event = new MonitoringEvent();
//            event.setSessionId(sessionId);
//            event.setEventType(MonitoringEvent.EventType.VOICE_ENROLLMENT_SUCCESS);
//            event.setDescription("Candidate voice profile created.");
//            eventRepository.save(event);
//
//            return ResponseEntity.ok("Voice enrolled successfully.");
//        } catch (Exception e) {
//            MonitoringEvent event = new MonitoringEvent();
//            event.setSessionId(sessionId);
//            event.setEventType(MonitoringEvent.EventType.VOICE_ENROLLMENT_FAILED);
//            event.setDescription("Voice enrollment failed: " + e.getMessage());
//            eventRepository.save(event);
//
//            return ResponseEntity.status(500).body("Voice enrollment failed.");
//        }
//    }
//
//    /**
//     * Endpoint for real-time voice verification.
//     */
//    @PostMapping("/voice-verify")
//    public ResponseEntity<String> verifyVoice(@RequestParam("audio") MultipartFile audioFile, @RequestParam("sessionId") String sessionId) {
//        Map<String, Object> result = voiceVerificationService.evaluateSpeaker(sessionId, audioFile.getBytes());
//
//        boolean isMatch = (boolean) result.get("isMatch");
//        double score = (double) result.get("score");
//
//        if (!isMatch && score > 0) { // Ignore API errors with score 0
//            MonitoringEvent event = new MonitoringEvent();
//            event.setSessionId(sessionId);
//            event.setEventType(MonitoringEvent.EventType.DIFFERENT_VOICE_DETECTED);
//            event.setDescription("A different voice was detected.");
//            event.setMetadata(String.format("{\"score\": %.2f, \"details\": \"%s\"}", score, result.get("details")));
//            eventRepository.save(event);
//            // You could also send a real-time notification via WebSocket here
//            return ResponseEntity.ok("ANOMALY_DETECTED");
//        }
//
//        return ResponseEntity.ok("OK");
//    }
//
//    // --- END OF NEW ENDPOINTS ---
//
//    /**
//     * Fetch all monitoring events for a given session
//     */
//    @GetMapping("/events/{sessionId}")
//    public ResponseEntity<List<MonitoringEvent>> getSessionEvents(@PathVariable String sessionId) {
//        List<MonitoringEvent> events = eventRepository.findBySessionIdOrderByTimestampDesc(sessionId);
//        return ResponseEntity.ok(events);
//    }
//
//    /**
//     * Get current status of all active sessions (for HR dashboard)
//     */
//    @GetMapping("/active-sessions")
//    public ResponseEntity<List<Map<String, Object>>> getActiveSessions() {
//        LocalDateTime thirtyMinutesAgo = LocalDateTime.now().minusMinutes(30);
//        List<MonitoringEvent> recentEvents = eventRepository.findRecentEventsBySession(thirtyMinutesAgo);
//
//        Map<String, MonitoringEvent> latestBySession = recentEvents.stream()
//                .collect(Collectors.toMap(
//                        MonitoringEvent::getSessionId,
//                        event -> event,
//                        (existing, replacement) ->
//                                existing.getTimestamp().isAfter(replacement.getTimestamp()) ? existing : replacement
//                ));
//
//        List<Map<String, Object>> activeSessions = latestBySession.values().stream()
//                .map(event -> {
//                    Map<String, Object> session = new HashMap<>();
//                    session.put("sessionId", event.getSessionId());
//                    session.put("candidateEmail", event.getCandidateEmail());
//                    session.put("status", event.getEventType());
//                    session.put("lastSeen", event.getTimestamp());
//                    session.put("description", event.getDescription());
//                    return session;
//                })
//                .collect(Collectors.toList());
//
//        return ResponseEntity.ok(activeSessions);
//    }
//
//    /**
//     * Get monitoring summary for a session
//     */
//    @GetMapping("/summary/{sessionId}")
//    public ResponseEntity<Map<String, Object>> getSessionSummary(@PathVariable String sessionId) {
//        List<MonitoringEvent> events = eventRepository.findBySessionIdOrderByTimestampDesc(sessionId);
//
//        if (events.isEmpty()) {
//            return ResponseEntity.notFound().build();
//        }
//
//        long totalEvents = events.size();
//        long faceDetectedCount = events.stream()
//                .filter(e -> e.getEventType() == MonitoringEvent.EventType.FACE_DETECTED)
//                .count();
//        long faceNotDetectedCount = events.stream()
//                .filter(e -> e.getEventType() == MonitoringEvent.EventType.FACE_NOT_DETECTED)
//                .count();
//
//        double presencePercentage = totalEvents > 0 ? (double) faceDetectedCount / totalEvents * 100 : 0;
//
//        Map<String, Object> summary = new HashMap<>();
//        summary.put("sessionId", sessionId);
//        summary.put("totalEvents", totalEvents);
//        summary.put("faceDetectedCount", faceDetectedCount);
//        summary.put("faceNotDetectedCount", faceNotDetectedCount);
//        summary.put("presencePercentage", Math.round(presencePercentage * 100.0) / 100.0);
//        summary.put("startTime", events.get(events.size() - 1).getTimestamp());
//        summary.put("lastActivity", events.get(0).getTimestamp());
//
//        return ResponseEntity.ok(summary);
//    }
//}