package com.msbcgroup.mockinterview.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.msbcgroup.mockinterview.model.*;
import com.msbcgroup.mockinterview.repository.*;
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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
    private InterviewSessionRepository sessionRepository;

    @Autowired
    private InterviewResultRepository interviewResultRepository;

    @Autowired
    private InterviewSummaryRepository interviewSummaryRepository;

    @Autowired
    private InterviewController interviewController;

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
            candidateData.put("firstRoundStatus", candidate.getFirstRoundStatus());
            candidateData.put("secondRoundStatus", candidate.getSecondRoundStatus());
            candidateData.put("secondRoundInterviewerEmail", candidate.getSecondRoundInterviewerEmail());
            candidateData.put("secondRoundInterviewerName", candidate.getSecondRoundInterviewerName());
            candidateData.put("currentRound", candidate.getCurrentRound());
            candidateData.put("lastDecisionTimestamp", candidate.getLastDecisionTimestamp());
            candidateData.put("decisionMadeBy", candidate.getDecisionMadeBy());

            // Only add interview status
            Optional<InterviewResult> interviewResult = interviewResultRepository.findByCandidateEmail(candidate.getCandidateEmail());
            List<InterviewMeeting> activeMeetings = meetingRepository.findAllByCandidateEmailAndStatus(candidate.getCandidateEmail(), InterviewMeeting.MeetingStatus.SCHEDULED);

            String interviewStatus;
            if (!activeMeetings.isEmpty()) {
                interviewStatus = "Scheduled";  // Active meeting takes priority
            } else if (interviewResult.isPresent() && interviewResult.get().getAttempts() >= 1) {
                interviewStatus = "Completed";  // No active meeting but has completed interviews
            } else {
                interviewStatus = "Pending";    // No meeting and no completed interviews
            }
            candidateData.put("interviewStatus", interviewStatus);

            boolean hasSummary = interviewResult.isPresent() && interviewResult.get().getAttempts() >= 1;
            candidateData.put("summaryStatus", hasSummary);

            return candidateData;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(candidatesWithStatus);
    }


//    @PostMapping("/create-meeting")
//    public ResponseEntity<Map<String, Object>> createMeeting(@AuthenticationPrincipal OAuth2User principal) {
//        String hrEmail = principal != null ? principal.getAttribute("email") : "unknown@example.com";
//
//        // Generate realistic Teams meeting URL for demo purposes
//        String meetingId = "meeting_" + UUID.randomUUID().toString().substring(0, 8);
//        String realisticUrl = "https://teams.microsoft.com/l/meetup-join/19%3ameeting_"
//                + UUID.randomUUID().toString().replace("-", "") + "%40thread.v2/0";
//
//        InterviewMeeting meeting = new InterviewMeeting();
//        meeting.setMeetingId(meetingId);
//        meeting.setHrEmail(hrEmail);
//        meeting.setMeetingUrl(realisticUrl);
//
//        meetingRepository.save(meeting);
//
//        Map<String, Object> response = new HashMap<>();
//        response.put("meetingId", meetingId);
//        response.put("meetingUrl", realisticUrl);
//        response.put("status", "created");
//        response.put("note", "Demo Teams meeting URL");
//
//        return ResponseEntity.ok(response);
//    }

    @PostMapping("/candidate/{candidateEmail}/round/select")
    public ResponseEntity<Map<String, Object>> selectCandidate(
            @PathVariable String candidateEmail,
            @AuthenticationPrincipal OAuth2User principal) {
        try {
            String hrEmail = principal != null ? principal.getAttribute("email") : "unknown@example.com";

            // 1. Find candidate
            Optional<CandidateProfile> candidateOpt = candidateProfileRepository.findByCandidateEmail(candidateEmail);
            if (!candidateOpt.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Candidate not found");
                return ResponseEntity.badRequest().body(response);
            }

            CandidateProfile candidate = candidateOpt.get();

            // 2. Validate interview status
            if ("Scheduled".equals(candidate.getInterviewStatus())) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Interview is scheduled. Please wait for completion before making decisions.");
                return ResponseEntity.badRequest().body(response);
            }

            // 3. Check if interview summary exists
            Optional<InterviewResult> interviewResult = interviewResultRepository.findByCandidateEmail(candidateEmail);
            if (!interviewResult.isPresent() || interviewResult.get().getAttempts() < 1) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Interview must be completed before making decisions");
                return ResponseEntity.badRequest().body(response);
            }

            // 4. Apply round logic
            String message;
            if (candidate.getFirstRoundStatus() == null) {
                // First round selection
                candidate.setFirstRoundStatus(RoundStatus.PASS);
                candidate.setSecondRoundStatus(RoundStatus.PENDING);
                candidate.setCurrentRound(2);
                message = "Candidate promoted to Round 2";
            } else if (candidate.getFirstRoundStatus() == RoundStatus.PASS &&
                    candidate.getSecondRoundStatus() == RoundStatus.PENDING) {
                // Second round selection
                candidate.setSecondRoundStatus(RoundStatus.PASS);
                candidate.setInterviewStatus("SELECTED");
                message = "Candidate selected for final";
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Invalid round state for selection");
                return ResponseEntity.badRequest().body(response);
            }

            // 5. Update timestamps and save
            candidate.setLastDecisionTimestamp(java.time.LocalDateTime.now());
            candidate.setDecisionMadeBy(hrEmail);
            candidateProfileRepository.save(candidate);

            // 6. Return success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", message);
            response.put("candidateData", buildCandidateResponse(candidate));
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error selecting candidate: " + candidateEmail, e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to select candidate: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }


    @PostMapping("/schedule-second-round")
    public ResponseEntity<?> scheduleSecondRound(@RequestBody ScheduleRequest scheduleRequest) {
        try {
            // Find the candidate by email
            CandidateProfile candidate = candidateProfileRepository.findByCandidateEmail(scheduleRequest.getCandidateEmail())
                    .orElseThrow(() -> new RuntimeException("Candidate not found with email: " + scheduleRequest.getCandidateEmail()));

            // Update the candidate's profile with the interviewer's details
            candidate.setSecondRoundInterviewerEmail(scheduleRequest.getInterviewerEmail());
            candidate.setSecondRoundInterviewerName(scheduleRequest.getInterviewerName());

            // Update the status to show it's scheduled
            candidate.setSecondRoundStatus(RoundStatus.SCHEDULED);

            // Save the changes to the database
            candidateProfileRepository.save(candidate);

            return ResponseEntity.ok().body("Second round scheduled successfully for " + candidate.getCandidateName());

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/candidate/{candidateEmail}/round/reject")
    public ResponseEntity<Map<String, Object>> rejectCandidate(
            @PathVariable String candidateEmail,
            @AuthenticationPrincipal OAuth2User principal) {
        try {
            String hrEmail = principal != null ? principal.getAttribute("email") : "unknown@example.com";

            // 1. Find candidate
            Optional<CandidateProfile> candidateOpt = candidateProfileRepository.findByCandidateEmail(candidateEmail);
            if (!candidateOpt.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Candidate not found");
                return ResponseEntity.badRequest().body(response);
            }

            CandidateProfile candidate = candidateOpt.get();

            // 2. Validate interview status
            if ("Scheduled".equals(candidate.getInterviewStatus())) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Interview is scheduled. Please wait for completion before making decisions.");
                return ResponseEntity.badRequest().body(response);
            }

            // 3. Check if interview summary exists
            Optional<InterviewResult> interviewResult = interviewResultRepository.findByCandidateEmail(candidateEmail);
            if (!interviewResult.isPresent() || interviewResult.get().getAttempts() < 1) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Interview must be completed before making decisions");
                return ResponseEntity.badRequest().body(response);
            }

            // 4. Apply round logic
            String message;
            if (candidate.getFirstRoundStatus() == null) {
                // First round rejection
                candidate.setFirstRoundStatus(RoundStatus.FAIL);
                candidate.setInterviewStatus("REJECTED");
                message = "Candidate rejected in Round 1";
            } else if (candidate.getFirstRoundStatus() == RoundStatus.PASS &&
                    candidate.getSecondRoundStatus() == RoundStatus.PENDING) {
                // Second round rejection
                candidate.setSecondRoundStatus(RoundStatus.FAIL);
                candidate.setInterviewStatus("REJECTED");
                message = "Candidate rejected in Round 2";
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Invalid round state for rejection");
                return ResponseEntity.badRequest().body(response);
            }

            // 5. Update timestamps and save
            candidate.setLastDecisionTimestamp(java.time.LocalDateTime.now());
            candidate.setDecisionMadeBy(hrEmail);
            candidateProfileRepository.save(candidate);

            // 6. Return success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", message);
            response.put("candidateData", buildCandidateResponse(candidate));
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error rejecting candidate: " + candidateEmail, e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to reject candidate: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
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
        candidateData.put("lastDecisionTimestamp", candidate.getLastDecisionTimestamp());
        candidateData.put("decisionMadeBy", candidate.getDecisionMadeBy());
        return candidateData;
    }


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

//    @PostMapping("/assign-candidate")
//    public ResponseEntity<Map<String, Object>> assignCandidate(
//            @RequestParam String meetingId,
//            @RequestParam String candidateEmail) {
//
//        // Deactivate any existing active meetings for this candidate
//        List<InterviewMeeting> existingMeetings = meetingRepository.findAllByCandidateEmailAndStatus(candidateEmail, InterviewMeeting.MeetingStatus.SCHEDULED);
//        existingMeetings.forEach(meeting -> {
//            meeting.setStatus(InterviewMeeting.MeetingStatus.COMPLETED);
//            meeting.setLoginToken(null); // Invalidate old tokens
//        });
//        meetingRepository.saveAll(existingMeetings);
//
//        InterviewMeeting meeting = meetingRepository.findByMeetingId(meetingId)
//                .orElseThrow(() -> new RuntimeException("Meeting not found"));
//
//        // Generate a secure, single-use token
//        String token = UUID.randomUUID().toString();
//        meeting.setLoginToken(token);
//        meeting.setTokenExpiry(LocalDateTime.now().plusHours(48)); // Token is valid for 48 hours
//
//        meeting.setCandidateEmail(candidateEmail);
//        meeting.setStatus(InterviewMeeting.MeetingStatus.SCHEDULED);
//        meetingRepository.save(meeting);
//
//        // Construct the magic link for the frontend
//        String magicLink = "http://localhost:8081/api/auth/start-interview/" + token;
//
//        Map<String, Object> response = new HashMap<>();
//        response.put("status", "assigned");
//        response.put("message", "Candidate assigned. Share this link with them.");
//        response.put("magicLink", magicLink);
//
//        return ResponseEntity.ok(response);
//    }

    @PostMapping("/candidates")
    public ResponseEntity<Map<String, Object>> addCandidate(@RequestBody CandidateProfile candidate) {
        if (candidate == null) {
            return ResponseEntity.badRequest().build();
        }

        Optional<CandidateProfile> existingCandidate = candidateProfileRepository.findByCandidateEmail(candidate.getCandidateEmail());
        if (existingCandidate.isPresent()) {
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
    public ResponseEntity<Map<String, Object>> updateResume(@RequestParam("resume") MultipartFile file,
                                                            @RequestParam("candidateEmail") String candidateEmail) {
        try {
            Optional<CandidateProfile> candidateOpt = candidateProfileRepository.findByCandidateEmail(candidateEmail);
            if (!candidateOpt.isPresent()) {
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
            if (email != null && !email.isEmpty()) {
                Optional<CandidateProfile> existingCandidate = candidateProfileRepository.findByCandidateEmail(email);
                if (existingCandidate.isPresent()) {
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

    @PostMapping("/candidate/{candidateEmail}/schedule-second-round")
    public ResponseEntity<Map<String, Object>> scheduleSecondRound(
            @PathVariable String candidateEmail,
            @AuthenticationPrincipal OAuth2User principal) {
        try {
            Optional<CandidateProfile> candidateOpt = candidateProfileRepository.findByCandidateEmail(candidateEmail);
            if (!candidateOpt.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Candidate not found");
                return ResponseEntity.badRequest().body(response);
            }

            CandidateProfile candidate = candidateOpt.get();

            // Validate candidate is eligible for second round
            if (!candidate.needsSecondRound()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Candidate not eligible for second round");
                return ResponseEntity.badRequest().body(response);
            }

            // Reset interview status for second round
            candidate.setInterviewStatus("PENDING");
            candidateProfileRepository.save(candidate);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Second round scheduled successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error scheduling second round for: " + candidateEmail, e);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Failed to schedule second round");
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



    @PostMapping("/schedule-interview")
    public ResponseEntity<Map<String, Object>> scheduleInterview(@RequestParam String candidateEmail) {
        try {
            System.out.println("scheduleInterview called for "+candidateEmail);
            // 1. Find the candidate's profile
            CandidateProfile profile = candidateProfileRepository.findByCandidateEmail(candidateEmail)
                    .orElseThrow(() -> new RuntimeException("Candidate profile not found for email: " + candidateEmail));

            // 2. Generate questions using the logic from InterviewController
            List<Question> questions = interviewController.generateQuestionsFromProfile(profile);

            // 3. Convert questions to JSON string
            ObjectMapper mapper = new ObjectMapper();
            String questionsJson = mapper.writeValueAsString(questions);


            // 4. Create and save the complete InterviewSession
            InterviewSession session = new InterviewSession();
            String sessionId = UUID.randomUUID().toString();
            session.setSessionId(sessionId);
            session.setCandidateEmail(candidateEmail);
            session.setQuestionsJson(questionsJson); // Save the generated questions
            System.out.println(questionsJson);
            session.setCompleted(false);
            sessionRepository.save(session);

            // 5. Return the sessionId to the frontend to build the magic link
            String magicLink = "http://localhost:8081/api/auth/start-interview/" + sessionId;

            InterviewMeeting meeting= new InterviewMeeting();
            meeting.setMeetingUrl(magicLink);
            meeting.setCandidateEmail(candidateEmail);
            meeting.setStatus(InterviewMeeting.MeetingStatus.SCHEDULED);
            meeting.setLoginToken(sessionId);
            meeting.setTokenExpiry(LocalDateTime.now().plusHours(48)); // Token is valid for 48 hours
            meetingRepository.save(meeting);



            Map<String, Object> response = new HashMap<>();
            response.put("magicLink", magicLink);
            response.put("message", "Interview scheduled successfully.");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("message", "Failed to schedule interview: " + e.getMessage());

            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}