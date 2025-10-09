package com.msbcgroup.mockinterview.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.msbcgroup.mockinterview.model.CandidateProfile;
import com.msbcgroup.mockinterview.model.InterviewMeeting;
import com.msbcgroup.mockinterview.repository.CandidateProfileRepository;
import com.msbcgroup.mockinterview.repository.InterviewMeetingRepository;
import com.msbcgroup.mockinterview.service.FileProcessingService;
import com.msbcgroup.mockinterview.service.ResumeParsingService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/hr")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class HRController {

    private static final Logger logger = LoggerFactory.getLogger(HRController.class);

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private InterviewMeetingRepository meetingRepository;

    @Autowired
    private ResumeParsingService resumeParsingService;

    @Autowired
    private FileProcessingService fileProcessingService;

    @GetMapping("/dashboard")
    public List<CandidateProfile> hrDashboard() {
        return candidateProfileRepository.findAll();
    }

    @PostMapping("/create-meeting")
    public ResponseEntity<Map<String, Object>> createMeeting(@AuthenticationPrincipal OAuth2User principal) {
        String hrEmail = principal != null ? principal.getAttribute("email") : "unknown@example.com";

        // Generate realistic Teams meeting URL for demo purposes
        String meetingId = "meeting_" + UUID.randomUUID().toString().substring(0, 8);
        String realisticUrl = "https://teams.microsoft.com/l/meetup-join/19%3ameeting_" 
            + UUID.randomUUID().toString().replace("-", "") + "%40thread.v2/0";

        InterviewMeeting meeting = new InterviewMeeting();
        meeting.setMeetingId(meetingId);
        meeting.setHrEmail(hrEmail);
        meeting.setMeetingUrl(realisticUrl);

        meetingRepository.save(meeting);

        Map<String, Object> response = new HashMap<>();
        response.put("meetingId", meetingId);
        response.put("meetingUrl", realisticUrl);
        response.put("status", "created");
        response.put("note", "Demo Teams meeting URL");

        return ResponseEntity.ok(response);
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
    public ResponseEntity<Map<String, Object>> addCandidate(@RequestBody CandidateProfile candidate) {
        if(candidate==null){
            return ResponseEntity.badRequest().build();
        }

        Optional<CandidateProfile> existingCandidate = candidateProfileRepository.findByCandidateEmail(candidate.getCandidateEmail());
        if(existingCandidate.isPresent()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Candidate with this email already exists");
            return ResponseEntity.badRequest().body(response);
        }

        CandidateProfile saved = candidateProfileRepository.save(candidate);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", saved);
        return ResponseEntity.ok(response);
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

    @PostMapping("/upload-resume")
    public ResponseEntity<Map<String, Object>> uploadResume(@RequestParam("resume") MultipartFile file) {
        try {
            String resumeText = fileProcessingService.extractTextFromFile(file);
            JsonNode parsedData = resumeParsingService.parseResume(resumeText);
            // Check if candidate already exists by email
            String email = parsedData.get("email").asText();
            if(email != null && !email.isEmpty()) {
                Optional<CandidateProfile> existingCandidate = candidateProfileRepository.findByCandidateEmail(email);
                if(existingCandidate.isPresent()) {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", false);
                    response.put("error", "Candidate with email " + email + " already exists");
                    return ResponseEntity.badRequest().body(response);
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", parsedData);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            
            return ResponseEntity.badRequest().body(response);
        }
    }

    @DeleteMapping("/candidates/{name}")
    public ResponseEntity<Map<String, String>> deleteCandidate(@PathVariable String name) {
        try {
            Optional<CandidateProfile> candidate = candidateProfileRepository.findByCandidateName(name);
            if (!candidate.isPresent()) {
                Map<String, String> response = new HashMap<>();
                response.put("error", "Candidate not found");
                return ResponseEntity.notFound().build();
            }

            candidateProfileRepository.deleteByCandidateName(name);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Candidate deleted successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, String> response = new HashMap<>();
            response.put("error", "Failed to delete candidate: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }


}