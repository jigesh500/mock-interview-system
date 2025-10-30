package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.model.CandidateProfile;
import com.msbcgroup.mockinterview.model.InterviewSession;
import com.msbcgroup.mockinterview.repository.InterviewSessionRepository;
import com.msbcgroup.mockinterview.service.CandidateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/candidate")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class CandidateDashboardController {

    @Autowired
    private InterviewSessionRepository sessionRepository;

    @Autowired
    private CandidateService candidateService;


        @GetMapping("/portal-info/{sessionId}")
    public ResponseEntity<Map<String, Object>> getInterviewInfoBySession(@PathVariable String sessionId) {
        // Find the session by its ID
        InterviewSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Invalid or expired session token."));

        // Use the email from the session to find the candidate's profile
        CandidateProfile profile = candidateService.findCandidateByEmail(session.getCandidateEmail());

        Map<String, Object> response = new HashMap<>();fffff
        response.put("candidateName", profile.getCandidateName());
        response.put("positionApplied", profile.getPositionApplied());
        response.put("message", "Welcome! Please press 'Start' when you are ready to begin the interview.");

        return ResponseEntity.ok(response);
    }

}
