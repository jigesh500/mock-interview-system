package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.model.CandidateProfile;
import com.msbcgroup.mockinterview.model.ScheduleRequest;
import com.msbcgroup.mockinterview.model.RoundStatus;
import com.msbcgroup.mockinterview.service.CandidateService;
import com.msbcgroup.mockinterview.service.InterviewService;
import com.msbcgroup.mockinterview.service.AuthService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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
    private InterviewService interviewService;

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
    public ResponseEntity<Map<String, String>> scheduleSecondRound(@RequestBody ScheduleRequest scheduleRequest) {
        Map<String, String> response = candidateService.scheduleSecondRound(scheduleRequest);
        return ResponseEntity.ok(response);
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

    @PostMapping("/candidate/{candidateEmail}/schedule-second-round")
    public ResponseEntity<Map<String, Object>> scheduleSecondRound(@PathVariable String candidateEmail) {
        Map<String, Object> response = interviewService.scheduleSecondRound(candidateEmail);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/candidates/{name}")
    public ResponseEntity<Map<String, String>> deleteCandidate(@PathVariable String name) {
        Map<String, String> response = candidateService.deleteCandidate(name);
        return ResponseEntity.ok(response);
    }



    @PostMapping("/schedule-interview")
    public ResponseEntity<Map<String, Object>> scheduleInterview(@RequestParam String candidateEmail) throws Exception {
        Map<String, Object> response = interviewService.scheduleInterview(candidateEmail);
        return ResponseEntity.ok(response);
    }
}