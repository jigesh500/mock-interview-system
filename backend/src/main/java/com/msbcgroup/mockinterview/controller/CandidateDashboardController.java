package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.model.InterviewMeeting;
import com.msbcgroup.mockinterview.model.InterviewSession;
import com.msbcgroup.mockinterview.repository.InterviewMeetingRepository;
import com.msbcgroup.mockinterview.repository.InterviewSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/candidate")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class CandidateDashboardController {

    @Autowired
    private InterviewMeetingRepository meetingRepository;

    @Autowired
    private InterviewSessionRepository sessionRepository;

    @GetMapping("/interview-info")
    public ResponseEntity<Map<String, Object>> getInterviewInfo(@AuthenticationPrincipal OAuth2User principal) {
        String candidateEmail = principal.getAttribute("email");

        List<InterviewMeeting> meetings = meetingRepository.findAllByCandidateEmailAndActiveTrue(candidateEmail);
        InterviewMeeting meeting = meetings.isEmpty() ? null : meetings.get(0);

        Map<String, Object> response = new HashMap<>();
        if (meeting != null) {
            response.put("hasInterview", true);
            response.put("meetingId", meeting.getMeetingId());
            response.put("meetingUrl", meeting.getMeetingUrl());
        } else {
            response.put("hasInterview", false);
            response.put("message", "No interview scheduled");
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/join-interview")
    public ResponseEntity<Map<String, Object>> joinInterview(@AuthenticationPrincipal OAuth2User principal) {
        String candidateEmail = principal.getAttribute("email");

        List<InterviewMeeting> meetings = meetingRepository.findAllByCandidateEmailAndActiveTrue(candidateEmail);
        if (meetings.isEmpty()) {
            throw new RuntimeException("No active interview found");
        }
        InterviewMeeting meeting = meetings.get(0);

        // Create exam session
        String sessionId = UUID.randomUUID().toString();

        InterviewSession session = new InterviewSession();
        session.setSessionId(sessionId);
        session.setCandidateEmail(candidateEmail);
        session.setMeetingId(meeting.getMeetingId());
        session.setHrEmail(meeting.getHrEmail());
        session.setCompleted(false);

        sessionRepository.save(session);

        Map<String, Object> response = new HashMap<>();
        response.put("sessionId", sessionId);
        response.put("teamsUrl", meeting.getMeetingUrl());
        response.put("examUrl", "/exam?sessionId=" + sessionId);

        return ResponseEntity.ok(response);
    }
}
