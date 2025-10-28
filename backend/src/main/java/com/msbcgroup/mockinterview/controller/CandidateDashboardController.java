package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.model.CandidateProfile;
import com.msbcgroup.mockinterview.model.InterviewSession;
import com.msbcgroup.mockinterview.repository.CandidateProfileRepository;
import com.msbcgroup.mockinterview.repository.InterviewSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
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
    private CandidateProfileRepository candidateProfileRepository;

    /**
     * Public endpoint for a candidate to get interview info using a session token.
     */
        @GetMapping("/portal-info/{sessionId}")
    public ResponseEntity<Map<String, Object>> getInterviewInfoBySession(@PathVariable String sessionId) {
        // Find the session by its ID (the token from the magic link)
        InterviewSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Invalid or expired session token."));

        // Use the email from the session to find the candidate's profile
        CandidateProfile profile = candidateProfileRepository.findByCandidateEmail(session.getCandidateEmail())
                .orElseThrow(() -> new RuntimeException("Candidate profile not found."));

        Map<String, Object> response = new HashMap<>();
        response.put("candidateName", profile.getCandidateName());
        response.put("positionApplied", profile.getPositionApplied());
        response.put("message", "Welcome! Please press 'Start' when you are ready to begin the interview.");

        return ResponseEntity.ok(response);
    }

    /**
     * This endpoint is now handled by the public /interview/start-with-session/{sessionId}
     * in InterviewController. The old /join-interview can be deprecated or removed if no longer used
     * by any other part of the application.
     *
     * For clarity, I am leaving the old endpoints below but they are not used in the new magic link flow.
     */

}
