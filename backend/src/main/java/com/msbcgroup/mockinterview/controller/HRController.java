package com.msbcgroup.mockinterview.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.msbcgroup.mockinterview.model.*;
import com.msbcgroup.mockinterview.service.*;
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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/hr")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class HRController {

    private static final Logger logger = LoggerFactory.getLogger(HRController.class);

    @Autowired
    private CandidateService candidateService;
    
    @Autowired
    private InterviewService interviewService;
    
    @Autowired
    private ResumeParsingService resumeParsingService;
    
    @Autowired
    private FileProcessingService fileProcessingService;

    @GetMapping("/dashboard")
    public ResponseEntity<List<Map<String, Object>>> hrDashboard() {
        return ResponseEntity.ok(candidateService.getAllCandidatesWithStatus());
    }




    @PostMapping("/candidate/{candidateEmail}/round/select")
    public ResponseEntity<Map<String, Object>> selectCandidate(
            @PathVariable String candidateEmail,
            @AuthenticationPrincipal OAuth2User principal) {
        String hrEmail = principal != null ? principal.getAttribute("email") : "unknown@example.com";
        CandidateProfile candidate = candidateService.selectCandidateForNextRound(candidateEmail, hrEmail);
        
        String message = candidate.getCurrentRound() == 2 ? "Candidate promoted to Round 2" : "Candidate selected for final";
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        response.put("candidateData", buildCandidateResponse(candidate));
        return ResponseEntity.ok(response);
    }


    @PostMapping("/schedule-second-round")
    public ResponseEntity<?> scheduleSecondRound(@RequestBody ScheduleRequest scheduleRequest) {
        CandidateProfile candidate = candidateService.findCandidateByEmail(scheduleRequest.getCandidateEmail());
        
        candidate.setSecondRoundInterviewerEmail(scheduleRequest.getInterviewerEmail());
        candidate.setSecondRoundInterviewerName(scheduleRequest.getInterviewerName());
        candidate.setSecondRoundStatus(RoundStatus.SCHEDULED);
        
        candidateService.updateCandidate(candidate);
        
        return ResponseEntity.ok().body("Second round scheduled successfully for " + candidate.getCandidateName());
    }

    @PostMapping("/candidate/{candidateEmail}/round/reject")
    public ResponseEntity<Map<String, Object>> rejectCandidate(
            @PathVariable String candidateEmail,
            @AuthenticationPrincipal OAuth2User principal) {
        String hrEmail = principal != null ? principal.getAttribute("email") : "unknown@example.com";
        CandidateProfile candidate = candidateService.rejectCandidate(candidateEmail, hrEmail);
        
        String message = candidate.getFirstRoundStatus() == RoundStatus.FAIL ? 
                "Candidate rejected in Round 1" : "Candidate rejected in Round 2";
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        response.put("candidateData", buildCandidateResponse(candidate));
        return ResponseEntity.ok(response);
    }

    // Helper method to build candidate response
    private Map<String, Object> buildCandidateResponse(CandidateProfile candidate) {
        Map<String, Object> candidateData = new HashMap<>();
        candidateData.put("candidateEmail", candidate.getCandidateEmail());
        candidateData.put("candidateName", candidate.getCandidateName());
        candidateData.put("firstRoundStatus", candidate.getFirstRoundStatus());
        candidateData.put("secondRoundStatus", candidate.getSecondRoundStatus());
        candidateData.put("currentRound", candidate.getCurrentRound());
        candidateData.put("interviewStatus", candidate.getInterviewStatus());
        candidateData.put("overallStatus", candidate.getOverallStatus());
        candidateData.put("lastDecisionTimestamp", candidate.getLastDecisionTimestamp());
        candidateData.put("decisionMadeBy", candidate.getDecisionMadeBy());
        return candidateData;
    }


    @GetMapping("/interview-summary/{candidateEmail}")
    public ResponseEntity<Map<String, Object>> getInterviewSummary(@PathVariable String candidateEmail) {
        Map<String, Object> summary = interviewService.getInterviewSummary(candidateEmail);
        return summary != null ? ResponseEntity.ok(summary) : ResponseEntity.notFound().build();
    }


    @GetMapping("/candidates/{candidateEmail}")
    public ResponseEntity<CandidateProfile> getCandidateByEmail(@PathVariable String candidateEmail) {
        CandidateProfile candidate = candidateService.findCandidateByEmail(candidateEmail);
        return ResponseEntity.ok(candidate);
    }



    @PostMapping("/candidates")
    public ResponseEntity<Map<String, Object>> addCandidate(@RequestBody CandidateProfile candidate) {
        if (candidate == null) {
            return ResponseEntity.badRequest().build();
        }
        
        CandidateProfile saved = candidateService.addCandidate(candidate);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", saved);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/update-resume")
    public ResponseEntity<Map<String, Object>> updateResume(@RequestParam("resume") MultipartFile file,
                                                            @RequestParam("candidateEmail") String candidateEmail) throws IOException {
        CandidateProfile candidate = candidateService.findCandidateByEmail(candidateEmail);
        
        String resumeText = fileProcessingService.extractTextFromFile(file);
        JsonNode parsedData = resumeParsingService.parseResume(resumeText);

        candidate.setCandidateName(parsedData.get("name").asText());
        candidate.setPositionApplied(parsedData.get("position").asText());
        candidate.setExperienceYears(parsedData.get("experience").asInt());
        candidate.setSkills(parsedData.get("skills").asText());
        candidate.setPhoneNumber(parsedData.get("phone").asText());
        candidate.setLocation(parsedData.get("location").asText());
        candidate.setDescription(parsedData.get("description").asText());
        CandidateProfile updatedCandidate = candidateService.updateCandidate(candidate);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", updatedCandidate);
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
    public ResponseEntity<Map<String, Object>> uploadResume(@RequestParam("resume") MultipartFile file) throws IOException {
        String resumeText = fileProcessingService.extractTextFromFile(file);
        JsonNode parsedData = resumeParsingService.parseResume(resumeText);
        
        String email = parsedData.get("email").asText();
        if (email != null && !email.isEmpty()) {
            try {
                candidateService.findCandidateByEmail(email);
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("error", "Candidate with email " + email + " already exists");
                return ResponseEntity.badRequest().body(response);
            } catch (RuntimeException e) {
                // Candidate not found, continue
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", parsedData);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/candidate/{candidateEmail}/schedule-second-round")
    public ResponseEntity<Map<String, Object>> scheduleSecondRound(
            @PathVariable String candidateEmail,
            @AuthenticationPrincipal OAuth2User principal) {
        interviewService.scheduleSecondRound(candidateEmail);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Second round scheduled successfully");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/candidates/{name}")
    public ResponseEntity<Map<String, String>> deleteCandidate(@PathVariable String name) {
        candidateService.deleteCandidate(name);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Candidate deleted successfully");
        return ResponseEntity.ok(response);
    }



    @PostMapping("/schedule-interview")
    public ResponseEntity<Map<String, Object>> scheduleInterview(@RequestParam String candidateEmail) throws Exception {
        String magicLink = interviewService.scheduleInterview(candidateEmail);
        
        Map<String, Object> response = new HashMap<>();
        response.put("magicLink", magicLink);
        response.put("message", "Interview scheduled successfully.");
        return ResponseEntity.ok(response);
    }
}