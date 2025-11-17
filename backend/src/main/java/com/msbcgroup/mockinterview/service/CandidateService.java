package com.msbcgroup.mockinterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.msbcgroup.mockinterview.model.*;
import com.msbcgroup.mockinterview.repository.*;
import com.msbcgroup.mockinterview.util.ResponseUtils;
import com.msbcgroup.mockinterview.mapper.CandidateMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CandidateService {

    private static final Logger logger = LoggerFactory.getLogger(CandidateService.class);

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private InterviewResultRepository interviewResultRepository;

    @Autowired
    private InterviewMeetingRepository meetingRepository;

    @Autowired
    private ResumeParsingService resumeParsingService;

    @Autowired
    private FileProcessingService fileProcessingService;

    @Autowired
    private InterviewSessionRepository sessionRepository;

    @Autowired
    private CandidateMapper candidateMapper;

    @Autowired
    private InterviewSummaryRepository interviewSummaryRepository;

    @Autowired
    private MonitoringEventRepository monitoringEventRepository;

    @Autowired
    private VoiceBaselineRepository voiceBaselineRepository;

    @Autowired
    private OutlookSMTPService outlookSMTPService;



    public List<Map<String, Object>> getAllCandidatesWithStatus() {
        List<CandidateProfile> candidates = candidateProfileRepository.findAll();
        return candidates.stream()
                .map(candidate -> {
                    determineOverallStatus(candidate);
                    return candidateMapper.toDetailedMap(candidate);
                })
                .collect(Collectors.toList());
    }

    public Map<String, Object> selectCandidateForNextRound(String candidateEmail, String hrEmail) {
        CandidateProfile candidate = findCandidateByEmail(candidateEmail);
        validateInterviewCompletion(candidateEmail);

        if (candidate.getFirstRoundStatus() == null) {
            candidate.setFirstRoundStatus(RoundStatus.PASS);
            candidate.setSecondRoundStatus(RoundStatus.PENDING);
            candidate.setCurrentRound(2);
            candidate.setOverallStatus("In Progress");
        } else if (candidate.getFirstRoundStatus() == RoundStatus.PASS &&
                candidate.getSecondRoundStatus() == RoundStatus.PENDING) {
            candidate.setSecondRoundStatus(RoundStatus.PASS);
            candidate.setInterviewStatus("SELECTED");
            candidate.setOverallStatus("Completed");
        } else {
            throw new RuntimeException("Invalid round state for selection");
        }

        candidate.setLastDecisionTimestamp(LocalDateTime.now());
        candidate.setDecisionMadeBy(hrEmail);
        CandidateProfile savedCandidate = candidateProfileRepository.save(candidate);

        String message = savedCandidate.getCurrentRound() == 2 ? "Candidate promoted to Round 2" : "Candidate selected for final";

        return ResponseUtils.createSuccessResponse(message, candidateMapper.toBasicMap(savedCandidate));
    }

    public Map<String, Object> rejectCandidate(String candidateEmail, String hrEmail) {
        CandidateProfile candidate = findCandidateByEmail(candidateEmail);
        validateInterviewCompletion(candidateEmail);

        if (candidate.getFirstRoundStatus() == null) {
            candidate.setFirstRoundStatus(RoundStatus.FAIL);
            candidate.setInterviewStatus("REJECTED");
            candidate.setOverallStatus("Completed");
        } else if (candidate.getFirstRoundStatus() == RoundStatus.PASS &&
                candidate.getSecondRoundStatus() == RoundStatus.PENDING) {
            candidate.setSecondRoundStatus(RoundStatus.FAIL);
            candidate.setInterviewStatus("REJECTED");
            candidate.setOverallStatus("Completed");
        } else {
            throw new RuntimeException("Invalid round state for rejection");
        }

        candidate.setLastDecisionTimestamp(LocalDateTime.now());
        candidate.setDecisionMadeBy(hrEmail);
        CandidateProfile savedCandidate = candidateProfileRepository.save(candidate);

        String message = savedCandidate.getFirstRoundStatus() == RoundStatus.FAIL ?
                "Candidate rejected in Round 1" : "Candidate rejected in Round 2";

        return ResponseUtils.createSuccessResponse(message, candidateMapper.toBasicMap(savedCandidate));
    }

    public Map<String, Object> addCandidate(CandidateProfile candidate) {
        if (candidate == null) {
            throw new IllegalArgumentException("Candidate cannot be null");
        }

        Optional<CandidateProfile> existing = candidateProfileRepository.findByCandidateEmail(candidate.getCandidateEmail());
        if (existing.isPresent()) {
            throw new RuntimeException("Candidate with this email already exists");
        }

        CandidateProfile saved = candidateProfileRepository.save(candidate);
        return ResponseUtils.createSuccessResponse("Candidate added successfully", saved);
    }

    public CandidateProfile findCandidateByEmail(String email) {
        return candidateProfileRepository.findByCandidateEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidate not found"));
    }

    public CandidateProfile updateCandidate(CandidateProfile candidate) {
        return candidateProfileRepository.save(candidate);
    }

    public Map<String, String> deleteCandidate(String name) {
        Optional<CandidateProfile> candidateOpt = candidateProfileRepository.findByCandidateName(name);
        if (!candidateOpt.isPresent()) {
            throw new RuntimeException("Candidate not found");
        }
        
        String candidateEmail = candidateOpt.get().getCandidateEmail();
        deleteCandidateCompletely(candidateEmail);
        candidateProfileRepository.deleteByCandidateName(name);
        return ResponseUtils.createSimpleResponse("Candidate and all related data deleted successfully");
    }

    public Map<String, String> deleteCandidateByEmail(String candidateEmail) {
        if (!candidateProfileRepository.findByCandidateEmail(candidateEmail).isPresent()) {
            throw new RuntimeException("Candidate not found");
        }
        
        deleteCandidateCompletely(candidateEmail);
        candidateProfileRepository.findByCandidateEmail(candidateEmail)
            .ifPresent(candidate -> candidateProfileRepository.delete(candidate));
        return ResponseUtils.createSimpleResponse("Candidate and all related data deleted successfully");
    }

    private void deleteCandidateCompletely(String candidateEmail) {
        // Delete all related data in proper order to avoid foreign key constraints
        try {
            monitoringEventRepository.findByCandidateEmailOrderByTimestampDesc(candidateEmail)
                .forEach(event -> monitoringEventRepository.delete(event));
            
            voiceBaselineRepository.findByCandidateEmail(candidateEmail)
                .ifPresent(baseline -> voiceBaselineRepository.delete(baseline));
            
            interviewResultRepository.findByCandidateEmail(candidateEmail)
                .ifPresent(result -> interviewResultRepository.delete(result));
            
            sessionRepository.findByCandidateEmail(candidateEmail)
                .forEach(session -> sessionRepository.delete(session));
            
            // Delete all meetings for the candidate regardless of status
            meetingRepository.findAll().stream()
                .filter(meeting -> candidateEmail.equals(meeting.getCandidateEmail()))
                .forEach(meeting -> meetingRepository.delete(meeting));
        } catch (Exception e) {
            // Log error but continue with deletion
            logger.error("Error deleting related data for candidate: " + candidateEmail, e);
        }
    }



    private String determineOverallStatus(CandidateProfile candidate) {
        String overallStatus = candidate.getOverallStatus();
        if (overallStatus == null) {
            if (candidate.getFirstRoundStatus() == RoundStatus.FAIL ||
                    candidate.getSecondRoundStatus() == RoundStatus.FAIL ||
                    candidate.getSecondRoundStatus() == RoundStatus.PASS) {
                overallStatus = "Completed";
            } else if (candidate.getFirstRoundStatus() == RoundStatus.PASS) {
                overallStatus = "In Progress";
            } else {
                overallStatus = "Pending";
            }
            candidate.setOverallStatus(overallStatus);
            candidateProfileRepository.save(candidate);
        }
        return overallStatus;
    }



    public Map<String, Object> updateCandidateResume(String candidateEmail, MultipartFile file) throws IOException {
        CandidateProfile candidate = findCandidateByEmail(candidateEmail);

        String resumeText = fileProcessingService.extractTextFromFile(file);
        JsonNode parsedData = resumeParsingService.parseResume(resumeText);

        candidate.setCandidateName(parsedData.get("name").asText());
        candidate.setPositionApplied(parsedData.get("position").asText());
        candidate.setExperienceYears(parsedData.get("experience").asInt());
        candidate.setSkills(parsedData.get("skills").asText());
        candidate.setPhoneNumber(parsedData.get("phone").asText());
        candidate.setLocation(parsedData.get("location").asText());
        candidate.setDescription(parsedData.get("description").asText());
        CandidateProfile updatedCandidate = updateCandidate(candidate);
        return ResponseUtils.createSuccessResponse("Resume updated successfully", updatedCandidate);
    }

    public Map<String, Object> parseAndValidateResume(MultipartFile file) throws IOException {
        String resumeText = fileProcessingService.extractTextFromFile(file);
        JsonNode parsedData = resumeParsingService.parseResume(resumeText);

        String email = parsedData.get("email").asText();
        if (email != null && !email.isEmpty()) {
            try {
                findCandidateByEmail(email);
                return ResponseUtils.createErrorResponse("Candidate with email " + email + " already exists");
            } catch (RuntimeException e) {
                // Candidate not found, continue
            }
        }

        return ResponseUtils.createSuccessResponse("Resume parsed successfully", parsedData);
    }



    public Map<String, Object> getInterviewInfoBySession(String sessionId) {
        InterviewSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Invalid or expired session token."));

        CandidateProfile profile = findCandidateByEmail(session.getCandidateEmail());

        Map<String, Object> response = new HashMap<>();
        response.put("candidateName", profile.getCandidateName());
        response.put("positionApplied", profile.getPositionApplied());
        response.put("message", "Welcome! Please press 'Start' when you are ready to begin the interview.");
        return response;
    }

    public Map<String, String> scheduleSecondRound(ScheduleRequest scheduleRequest) {
        CandidateProfile candidate = findCandidateByEmail(scheduleRequest.getCandidateEmail());

        candidate.setSecondRoundInterviewerEmail(scheduleRequest.getInterviewerEmail());
        candidate.setSecondRoundInterviewerName(scheduleRequest.getInterviewerName());
        candidate.setSecondRoundScheduledDateTime(scheduleRequest.getScheduledDateTime());
        candidate.setSecondRoundNotes(scheduleRequest.getNotes());
        candidate.setSecondRoundStatus(RoundStatus.SCHEDULED);

        updateCandidate(candidate);
        
        // Send email notification to interviewer
        try {
            outlookSMTPService.sendSecondRoundScheduleEmail(
                candidate, 
                scheduleRequest.getInterviewerEmail(), 
                scheduleRequest.getInterviewerName(),
                scheduleRequest.getScheduledDateTime()
            );
            logger.info("PI interview email sent successfully for candidate: {}", candidate.getCandidateName());
        } catch (Exception e) {
            logger.error("Failed to send PI interview email for candidate: {}", candidate.getCandidateName(), e);
            // Continue with scheduling even if email fails
        }
        
        return ResponseUtils.createSimpleResponse("PI interview scheduled successfully for " + candidate.getCandidateName() + ". Email sent to interviewer.");
    }

    private void validateInterviewCompletion(String candidateEmail) {
        Optional<InterviewResult> interviewResult = interviewResultRepository.findByCandidateEmail(candidateEmail);
        if (!interviewResult.isPresent() || interviewResult.get().getAttempts() < 1) {
            throw new RuntimeException("Interview must be completed before making decisions");
        }
    }
}