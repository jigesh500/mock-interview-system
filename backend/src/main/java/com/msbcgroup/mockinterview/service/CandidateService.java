package com.msbcgroup.mockinterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.msbcgroup.mockinterview.model.*;
import com.msbcgroup.mockinterview.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CandidateService {

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

    public List<Map<String, Object>> getAllCandidatesWithStatus() {
        List<CandidateProfile> candidates = candidateProfileRepository.findAll();
        return candidates.stream().map(this::buildCandidateWithStatus).collect(Collectors.toList());
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
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        response.put("candidateData", buildCandidateResponse(savedCandidate));
        return response;
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
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", message);
        response.put("candidateData", buildCandidateResponse(savedCandidate));
        return response;
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
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", saved);
        return response;
    }

    public CandidateProfile findCandidateByEmail(String email) {
        return candidateProfileRepository.findByCandidateEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidate not found"));
    }

    public CandidateProfile updateCandidate(CandidateProfile candidate) {
        return candidateProfileRepository.save(candidate);
    }

    public Map<String, String> deleteCandidate(String name) {
        if (!candidateProfileRepository.findByCandidateName(name).isPresent()) {
            throw new RuntimeException("Candidate not found");
        }
        candidateProfileRepository.deleteByCandidateName(name);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Candidate deleted successfully");
        return response;
    }

    private Map<String, Object> buildCandidateWithStatus(CandidateProfile candidate) {
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
        
        String overallStatus = determineOverallStatus(candidate);
        candidateData.put("overallStatus", overallStatus);
        
        String interviewStatus = determineInterviewStatus(candidate);
        candidateData.put("interviewStatus", interviewStatus);
        
        Optional<InterviewResult> interviewResult = interviewResultRepository.findByCandidateEmail(candidate.getCandidateEmail());
        boolean hasSummary = interviewResult.isPresent() && interviewResult.get().getAttempts() >= 1;
        candidateData.put("summaryStatus", hasSummary);
        
        return candidateData;
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

    private String determineInterviewStatus(CandidateProfile candidate) {
        Optional<InterviewResult> interviewResult = interviewResultRepository.findByCandidateEmail(candidate.getCandidateEmail());
        List<InterviewMeeting> activeMeetings = meetingRepository.findAllByCandidateEmailAndStatus(
                candidate.getCandidateEmail(), InterviewMeeting.MeetingStatus.SCHEDULED);

        if (!activeMeetings.isEmpty()) {
            return "Scheduled";
        } else if (interviewResult.isPresent() && interviewResult.get().getAttempts() >= 1) {
            return "Completed";
        } else {
            return "Pending";
        }
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

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", updatedCandidate);
        return response;
    }
    
    public Map<String, Object> parseAndValidateResume(MultipartFile file) throws IOException {
        String resumeText = fileProcessingService.extractTextFromFile(file);
        JsonNode parsedData = resumeParsingService.parseResume(resumeText);
        
        String email = parsedData.get("email").asText();
        if (email != null && !email.isEmpty()) {
            try {
                findCandidateByEmail(email);
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("error", "Candidate with email " + email + " already exists");
                return response;
            } catch (RuntimeException e) {
                // Candidate not found, continue
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", parsedData);
        return response;
    }
    
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
        candidate.setSecondRoundStatus(RoundStatus.SCHEDULED);
        
        updateCandidate(candidate);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Second round scheduled successfully for " + candidate.getCandidateName());
        return response;
    }
    
    private void validateInterviewCompletion(String candidateEmail) {
        Optional<InterviewResult> interviewResult = interviewResultRepository.findByCandidateEmail(candidateEmail);
        if (!interviewResult.isPresent() || interviewResult.get().getAttempts() < 1) {
            throw new RuntimeException("Interview must be completed before making decisions");
        }
    }
}