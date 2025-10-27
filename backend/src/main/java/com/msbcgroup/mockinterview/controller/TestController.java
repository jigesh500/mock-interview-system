package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.model.InterviewMeeting;
import com.msbcgroup.mockinterview.model.InterviewSession;
import com.msbcgroup.mockinterview.model.MonitoringEvent;
import com.msbcgroup.mockinterview.repository.InterviewMeetingRepository;
import com.msbcgroup.mockinterview.repository.InterviewSessionRepository;
import com.msbcgroup.mockinterview.repository.MonitoringEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

//@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "*")
public class TestController {

    @Autowired
    private MonitoringEventRepository eventRepository;

    @Autowired
    private InterviewMeetingRepository meetingRepository;

    @Autowired
    private InterviewSessionRepository sessionRepository;

    // Test HR create meeting
    @PostMapping("/hr/create-meeting")
    public ResponseEntity<Map<String, Object>> testCreateMeeting(@RequestParam String hrEmail) {
        String meetingId = "meeting_" + UUID.randomUUID().toString().substring(0, 8);
        String mockTeamsUrl = "https://teams.microsoft.com/l/meetup-join/mock/" + meetingId;

        InterviewMeeting meeting = new InterviewMeeting();
        meeting.setMeetingId(meetingId);
        meeting.setHrEmail(hrEmail);
        meeting.setMeetingUrl(mockTeamsUrl);

        meetingRepository.save(meeting);

        Map<String, Object> response = new HashMap<>();
        response.put("meetingId", meetingId);
        response.put("meetingUrl", mockTeamsUrl);
        response.put("status", "created");

        return ResponseEntity.ok(response);
    }

    // Test assign candidate
    @PostMapping("/hr/assign-candidate")
    public ResponseEntity<Map<String, String>> testAssignCandidate(
            @RequestParam String meetingId,
            @RequestParam String candidateEmail) {

        InterviewMeeting meeting = meetingRepository.findByMeetingId(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        meeting.setCandidateEmail(candidateEmail);
        meetingRepository.save(meeting);

        Map<String, String> response = new HashMap<>();
        response.put("status", "assigned");
        response.put("message", "Candidate assigned successfully");

        return ResponseEntity.ok(response);
    }

    // Get all sessions (for debugging)
    @GetMapping("/sessions")
    public ResponseEntity<List<InterviewSession>> getAllSessions() {
        return ResponseEntity.ok(sessionRepository.findAll());
    }
    @GetMapping("/events")
    public ResponseEntity<List<MonitoringEvent>> getAllEvents() {
        return ResponseEntity.ok(eventRepository.findAll());
    }


    // GET endpoint for browser testing
    @GetMapping("/websocket-test")
    public ResponseEntity<String> testWebSocketGet() {
        return ResponseEntity.ok("WebSocket test endpoint is working! Use POST method to save events.");
    }

    // POST endpoint for actual event saving
    @PostMapping("/websocket-test")
    public ResponseEntity<String> testWebSocket(@RequestBody Map<String, Object> eventData) {
        MonitoringEvent event = new MonitoringEvent();
        event.setSessionId((String) eventData.get("sessionId"));
        event.setCandidateEmail((String) eventData.get("candidateEmail"));
        event.setEventType(MonitoringEvent.EventType.valueOf((String) eventData.get("eventType")));
        event.setDescription((String) eventData.get("description"));

        eventRepository.save(event);
        return ResponseEntity.ok("Event saved to monitoring_event table");
    }

    @GetMapping("/simple-test")
    public String simpleTest() {
        return "Simple test works!";
    }


}
