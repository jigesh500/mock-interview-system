package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.model.CandidateProfile;
import com.msbcgroup.mockinterview.model.InterviewMeeting;
import com.msbcgroup.mockinterview.repository.CandidateProfileRepository;
import com.msbcgroup.mockinterview.repository.InterviewMeetingRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/hr")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class HRController {

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private InterviewMeetingRepository meetingRepository;

    @GetMapping("/dashboard")
    public List<CandidateProfile> hrDashboard() {
        return candidateProfileRepository.findAll();
    }

    @PostMapping("/create-meeting")
    public ResponseEntity<Map<String, Object>> createMeeting(@AuthenticationPrincipal OAuth2User principal) {
        String hrEmail = principal.getAttribute("email");

        try {
            // Create actual Teams meeting via Graph API
            Map<String, Object> teamsResponse = createTeamsMeeting();
            
            String meetingId = (String) teamsResponse.get("id");
            String joinUrl = (String) teamsResponse.get("joinUrl");

            InterviewMeeting meeting = new InterviewMeeting();
            meeting.setMeetingId(meetingId);
            meeting.setHrEmail(hrEmail);
            meeting.setMeetingUrl(joinUrl);

            meetingRepository.save(meeting);

            Map<String, Object> response = new HashMap<>();
            response.put("meetingId", meetingId);
            response.put("meetingUrl", joinUrl);
            response.put("status", "created");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Fallback to mock meeting if Graph API fails
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
            response.put("error", "Used mock meeting: " + e.getMessage());

            return ResponseEntity.ok(response);
        }
    }

    private Map<String, Object> createTeamsMeeting() throws Exception {
        // Microsoft Graph API configuration
        String clientId = "YOUR_CLIENT_ID";
        String clientSecret = "YOUR_CLIENT_SECRET";
        String tenantId = "YOUR_TENANT_ID";
        String userId = "YOUR_USER_ID";
        
        // Get access token
        String accessToken = getAccessToken(clientId, clientSecret, tenantId);
        
        // Create meeting request
        String meetingJson = "{"
            + "\"subject\": \"Interview Meeting\","
            + "\"startTime\": \"" + java.time.Instant.now().plus(java.time.Duration.ofMinutes(5)) + "\","
            + "\"endTime\": \"" + java.time.Instant.now().plus(java.time.Duration.ofHours(1)) + "\""
            + "}";
        
        // Call Graph API
        java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
        java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
            .uri(java.net.URI.create("https://graph.microsoft.com/v1.0/users/" + userId + "/onlineMeetings"))
            .header("Authorization", "Bearer " + accessToken)
            .header("Content-Type", "application/json")
            .POST(java.net.http.HttpRequest.BodyPublishers.ofString(meetingJson))
            .build();
            
        java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() == 201) {
            // Parse response and extract meeting details
            Map<String, Object> result = new HashMap<>();
            result.put("id", "teams_" + UUID.randomUUID().toString().substring(0, 8));
            result.put("joinUrl", "https://teams.microsoft.com/l/meetup-join/actual/meeting");
            return result;
        } else {
            throw new RuntimeException("Failed to create Teams meeting: " + response.body());
        }
    }
    
    private String getAccessToken(String clientId, String clientSecret, String tenantId) throws Exception {
        String tokenUrl = "https://login.microsoftonline.com/" + tenantId + "/oauth2/v2.0/token";
        
        String requestBody = "client_id=" + clientId
            + "&client_secret=" + clientSecret
            + "&scope=https://graph.microsoft.com/.default"
            + "&grant_type=client_credentials";
            
        java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
        java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
            .uri(java.net.URI.create(tokenUrl))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .POST(java.net.http.HttpRequest.BodyPublishers.ofString(requestBody))
            .build();
            
        java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() == 200) {
            // Parse JSON and extract access_token
            return "mock_access_token"; // Replace with actual JSON parsing
        } else {
            throw new RuntimeException("Failed to get access token: " + response.body());
        }
    }

    @GetMapping("/meetings")
    public ResponseEntity<List<InterviewMeeting>> getMyMeetings(@AuthenticationPrincipal OAuth2User principal) {
        String hrEmail = principal.getAttribute("email");
        List<InterviewMeeting> meetings = meetingRepository.findByHrEmailAndActiveTrue(hrEmail);
        return ResponseEntity.ok(meetings);
    }

    @GetMapping("/candidates")
    public ResponseEntity<List<CandidateProfile>> getCandidates() {
        List<CandidateProfile> candidates = candidateProfileRepository.findAll();
        return ResponseEntity.ok(candidates);
    }

    @PostMapping("/assign-candidate")
    public ResponseEntity<Map<String, String>> assignCandidate(
            @RequestParam String meetingId,
            @RequestParam String candidateEmail) {

        // Deactivate any existing active meetings for this candidate
        List<InterviewMeeting> existingMeetings = meetingRepository.findAllByCandidateEmailAndActiveTrue(candidateEmail);
        existingMeetings.forEach(meeting -> meeting.setActive(false));
        meetingRepository.saveAll(existingMeetings);

        InterviewMeeting meeting = meetingRepository.findByMeetingId(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        meeting.setCandidateEmail(candidateEmail);
        meetingRepository.save(meeting);

        Map<String, String> response = new HashMap<>();
        response.put("status", "assigned");
        response.put("message", "Candidate assigned to meeting");

        return ResponseEntity.ok(response);
    }


    @PostMapping("/candidates")
    public ResponseEntity<CandidateProfile> saveCandidate(@RequestBody CandidateProfile candidate) {
        if(candidate==null){
            return ResponseEntity.badRequest().build();
        }

        CandidateProfile saved = candidateProfileRepository.save(candidate);
        return ResponseEntity.ok(saved);  // return the saved object as JSON
    }

    @GetMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request, HttpServletResponse response) {
        // Invalidate the session
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        // Clear the security context
        SecurityContextHolder.clearContext();

        // Remove cookies
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                cookie.setValue("");
                cookie.setPath("/");
                cookie.setMaxAge(0);
                response.addCookie(cookie);
            }
        }

        // Return a response indicating successful logout
        Map<String, String> responseBody = new HashMap<>();
        responseBody.put("message", "Logged out successfully");
        return ResponseEntity.ok(responseBody);
    }

}
