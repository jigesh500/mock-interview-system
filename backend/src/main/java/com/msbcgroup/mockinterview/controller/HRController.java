package com.msbcgroup.mockinterview.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.msbcgroup.mockinterview.model.CandidateProfile;
import com.msbcgroup.mockinterview.model.InterviewMeeting;
import com.msbcgroup.mockinterview.model.InterviewResult;
import com.msbcgroup.mockinterview.model.InterviewSummary;
import com.msbcgroup.mockinterview.repository.CandidateProfileRepository;
import com.msbcgroup.mockinterview.repository.InterviewMeetingRepository;
import com.msbcgroup.mockinterview.repository.InterviewResultRepository;
import com.msbcgroup.mockinterview.repository.InterviewSummaryRepository;
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
import java.util.stream.Collectors;

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


    @Autowired
    private InterviewResultRepository interviewResultRepository;

    @Autowired
    private InterviewSummaryRepository interviewSummaryRepository;


    @GetMapping("/dashboard")
    public ResponseEntity<List<Map<String, Object>>> hrDashboard() {
        List<CandidateProfile> candidates = candidateProfileRepository.findAll();
        List<Map<String, Object>> candidatesWithStatus = candidates.stream().map(candidate -> {
            Map<String, Object> candidateData = new HashMap<>();
            candidateData.put("id", candidate.getId());
            candidateData.put("candidateName", candidate.getCandidateName());
            candidateData.put("candidateEmail", candidate.getCandidateEmail());
            candidateData.put("positionApplied", candidate.getPositionApplied());
            candidateData.put("experienceYears", candidate.getExperienceYears());
            candidateData.put("skills", candidate.getSkills());

            // Only add interview status
            Optional<InterviewResult> interviewResult = interviewResultRepository.findByCandidateEmail(candidate.getCandidateEmail());
            List<InterviewMeeting> activeMeetings = meetingRepository.findAllByCandidateEmailAndStatus(candidate.getCandidateEmail(), InterviewMeeting.MeetingStatus.SCHEDULED);

            String interviewStatus;
            if (interviewResult.isPresent() && interviewResult.get().getAttempts() >= 1) {
                interviewStatus = "Completed";  // Interview finished - highest priority
            } else if (!activeMeetings.isEmpty()) {
                interviewStatus = "Scheduled";  // Meeting assigned but not completed
            } else {
                interviewStatus = "Pending";    // No meeting assigned
            }
            candidateData.put("interviewStatus", interviewStatus);

            boolean hasSummary = interviewResult.isPresent() && interviewResult.get().getAttempts() >= 1;
            candidateData.put("summaryStatus", hasSummary);

            return candidateData;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(candidatesWithStatus);
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

//    @GetMapping("/meetings")
//    public ResponseEntity<List<InterviewMeeting>> getMyMeetings(@AuthenticationPrincipal OAuth2User principal) {
//        String hrEmail = principal.getAttribute("email");
//        List<InterviewMeeting> meetings = meetingRepository.findByHrEmailAndActiveTrue(hrEmail);
//        return ResponseEntity.ok(meetings);
//    }

    @GetMapping("/interview-summary/{candidateEmail}")
    public ResponseEntity<Map<String, Object>> getInterviewSummary(@PathVariable String candidateEmail) {
        try {
            Optional<InterviewResult> result = interviewResultRepository.findByCandidateEmail(candidateEmail);

            if (result.isPresent() && result.get().getSummary() != null) {
                Long summaryId = result.get().getSummary().getId();
                Optional<InterviewSummary> summary = interviewSummaryRepository.findById(summaryId);

                if (summary.isPresent()) {
                    Map<String, Object> response = new HashMap<>();
                    response.put("score", summary.get().getScore());
                    response.put("summary", summary.get().getSummary());
                    return ResponseEntity.ok(response);
                }
            }

            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error fetching interview summary for candidate: " + candidateEmail, e);
            return ResponseEntity.notFound().build();
        }
    }


    @GetMapping("/candidates/{candidateEmail}")
    public ResponseEntity<CandidateProfile> getCandidateByEmail(@PathVariable String candidateEmail) {
        try {
            Optional<CandidateProfile> candidate = candidateProfileRepository.findByCandidateEmail(candidateEmail);
            System.out.println(candidate);
            if (candidate.isPresent()) {

                return ResponseEntity.ok(candidate.get());

            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error fetching candidate details for: " + candidateEmail, e);
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/assign-candidate")
    public ResponseEntity<Map<String, String>> assignCandidate(
            @RequestParam String meetingId,
            @RequestParam String candidateEmail) {

        // Deactivate any existing active meetings for this candidate
        List<InterviewMeeting> existingMeetings = meetingRepository.findAllByCandidateEmailAndStatus(candidateEmail, InterviewMeeting.MeetingStatus.SCHEDULED);
        existingMeetings.forEach(meeting -> meeting.setStatus(InterviewMeeting.MeetingStatus.COMPLETED));
        meetingRepository.saveAll(existingMeetings);

        InterviewMeeting meeting = meetingRepository.findByMeetingId(meetingId)
                .orElseThrow(() -> new RuntimeException("Meeting not found"));

        meeting.setCandidateEmail(candidateEmail);
        meeting.setStatus(InterviewMeeting.MeetingStatus.SCHEDULED);
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

    @PutMapping("/update-resume")
    public ResponseEntity<Map<String,Object>> updateResume(@RequestParam("resume") MultipartFile file,
                                                           @RequestParam("candidateEmail") String candidateEmail) {
        try {
            Optional<CandidateProfile> candidateOpt = candidateProfileRepository.findByCandidateEmail(candidateEmail);
            if(!candidateOpt.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("error", "Candidate not found");
                return ResponseEntity.badRequest().body(response);
            }

            String resumeText = fileProcessingService.extractTextFromFile(file);
            JsonNode parsedData = resumeParsingService.parseResume(resumeText);

            CandidateProfile candidate = candidateOpt.get();
            candidate.setCandidateName(parsedData.get("name").asText());
            candidate.setPositionApplied(parsedData.get("position").asText());
            candidate.setExperienceYears(parsedData.get("experience").asInt());
            candidate.setSkills(parsedData.get("skills").asText());
            candidate.setPhoneNumber(parsedData.get("phone").asText());
            candidate.setLocation(parsedData.get("location").asText());
            candidate.setDescription(parsedData.get("description").asText());
            CandidateProfile updatedCandidate = candidateProfileRepository.save(candidate);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", updatedCandidate);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
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