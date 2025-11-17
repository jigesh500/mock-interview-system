package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.dto.InterviewScheduleResponse;
import com.msbcgroup.mockinterview.dto.InterviewSummaryResponse;
import com.msbcgroup.mockinterview.model.CandidateProfile;
import com.msbcgroup.mockinterview.model.ScheduleRequest;
import com.msbcgroup.mockinterview.service.AuthService;
import com.msbcgroup.mockinterview.service.CandidateService;
import com.msbcgroup.mockinterview.service.InterviewServiceInterface;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/hr")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class HRController {

    private static final Logger logger = LoggerFactory.getLogger(HRController.class);

    @Autowired
    private CandidateService candidateService;

    @Autowired
    private InterviewServiceInterface interviewService;

    @Autowired
    private AuthService authService;

    @GetMapping("/dashboard")
    public ResponseEntity<List<Map<String, Object>>> hrDashboard() {
        List<Map<String, Object>> candidates = candidateService.getAllCandidatesWithStatus();
        return ResponseEntity.ok(candidates);
    }

    @PostMapping("/candidate/{candidateEmail}/round/select")
    public ResponseEntity<Map<String, Object>> selectCandidate(
            @PathVariable String candidateEmail,
            @AuthenticationPrincipal OAuth2User principal) {
        String hrEmail = authService.extractEmailFromPrincipal(principal);
        Map<String, Object> response = candidateService.selectCandidateForNextRound(candidateEmail, hrEmail);
        return ResponseEntity.ok(response);
    }


    @PostMapping("/schedule-second-round")
    public ResponseEntity<Map<String, Object>> scheduleSecondRound(@RequestBody ScheduleRequest scheduleRequest) {
        try {
            // Validate required fields
            if (scheduleRequest.getCandidateEmail() == null || scheduleRequest.getInterviewerEmail() == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Candidate email and interviewer email are required");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            Map<String, String> response = candidateService.scheduleSecondRound(scheduleRequest);
            Map<String, Object> successResponse = new HashMap<>();
            successResponse.put("message", response.get("message"));
            successResponse.put("success", true);
            successResponse.put("candidateEmail", scheduleRequest.getCandidateEmail());
            successResponse.put("interviewerEmail", scheduleRequest.getInterviewerEmail());
            successResponse.put("scheduledDateTime", scheduleRequest.getScheduledDateTime());
            
            return ResponseEntity.ok(successResponse);
        } catch (Exception e) {
            logger.error("Error scheduling second round interview", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to schedule second round: " + e.getMessage());
            errorResponse.put("success", false);
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/candidate/{candidateEmail}/round/reject")
    public ResponseEntity<Map<String, Object>> rejectCandidate(
            @PathVariable String candidateEmail,
            @AuthenticationPrincipal OAuth2User principal) {
        String hrEmail = authService.extractEmailFromPrincipal(principal);
        Map<String, Object> response = candidateService.rejectCandidate(candidateEmail, hrEmail);
        return ResponseEntity.ok(response);
    }




    @GetMapping("/interview-summary/{candidateEmail}")
    public ResponseEntity<Map<String, Object>> getInterviewSummary(@PathVariable String candidateEmail) {
        try {
            InterviewSummaryResponse summary = interviewService.getInterviewSummary(candidateEmail);
            Map<String, Object> response = new HashMap<>();
            response.put("score", summary.getScore());
            response.put("summary", summary.getSummary());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }


    @GetMapping("/candidates/{candidateEmail}")
    public ResponseEntity<CandidateProfile> getCandidateByEmail(@PathVariable String candidateEmail) {
        CandidateProfile candidate = candidateService.findCandidateByEmail(candidateEmail);
        return ResponseEntity.ok(candidate);
    }



    @PostMapping("/candidates")
    public ResponseEntity<Map<String, Object>> addCandidate(@RequestBody CandidateProfile candidate) {
        Map<String, Object> response = candidateService.addCandidate(candidate);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/update-resume")
    public ResponseEntity<Map<String, Object>> updateResume(
            @RequestParam("resume") MultipartFile file,
            @RequestParam("candidateEmail") String candidateEmail) throws IOException {
        Map<String, Object> response = candidateService.updateCandidateResume(candidateEmail, file);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        Map<String, String> response = authService.logout();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/upload-resume")
    public ResponseEntity<Map<String, Object>> uploadResume(@RequestParam("resume") MultipartFile file) throws IOException {
        Map<String, Object> response = candidateService.parseAndValidateResume(file);
        return response.containsKey("error") ?
                ResponseEntity.badRequest().body(response) :
                ResponseEntity.ok(response);
    }

    @DeleteMapping("/candidates/{name}")
    public ResponseEntity<Map<String, String>> deleteCandidate(@PathVariable String name) {
        Map<String, String> response = candidateService.deleteCandidate(name);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/candidates/email/{candidateEmail}")
    public ResponseEntity<Map<String, String>> deleteCandidateByEmail(@PathVariable String candidateEmail) {
        Map<String, String> response = candidateService.deleteCandidateByEmail(candidateEmail);
        return ResponseEntity.ok(response);
    }



    @PostMapping("/schedule-interview")
    public ResponseEntity<Map<String, Object>> scheduleInterview(@RequestParam String candidateEmail) throws Exception {
        InterviewScheduleResponse scheduleResponse = interviewService.scheduleInterview(candidateEmail);
        Map<String, Object> response = new HashMap<>();
        response.put("magicLink", scheduleResponse.getMagicLink());
        response.put("message", scheduleResponse.getMessage());
        response.put("sessionId", scheduleResponse.getSessionId());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/test-email")
    public ResponseEntity<Map<String, String>> testEmail() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Email service is configured and ready");
        response.put("hrEmail", "jigesh.jethava@msbcgroup.com");
        return ResponseEntity.ok(response);
    }
}