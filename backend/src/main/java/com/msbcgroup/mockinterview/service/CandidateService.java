package com.msbcgroup.mockinterview.service;

import com.msbcgroup.mockinterview.model.*;
import com.msbcgroup.mockinterview.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

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

    public List<Map<String, Object>> getAllCandidatesWithStatus() {
        List<CandidateProfile> candidates = candidateProfileRepository.findAll();
        return candidates.stream().map(this::buildCandidateWithStatus).collect(Collectors.toList());
    }

    public CandidateProfile selectCandidateForNextRound(String candidateEmail, String hrEmail) {
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
        return candidateProfileRepository.save(candidate);
    }

    public CandidateProfile rejectCandidate(String candidateEmail, String hrEmail) {
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
        return candidateProfileRepository.save(candidate);
    }

    public CandidateProfile addCandidate(CandidateProfile candidate) {
        Optional<CandidateProfile> existing = candidateProfileRepository.findByCandidateEmail(candidate.getCandidateEmail());
        if (existing.isPresent()) {
            throw new RuntimeException("Candidate with this email already exists");
        }
        return candidateProfileRepository.save(candidate);
    }

    public CandidateProfile findCandidateByEmail(String email) {
        return candidateProfileRepository.findByCandidateEmail(email)
                .orElseThrow(() -> new RuntimeException("Candidate not found"));
    }

    public CandidateProfile updateCandidate(CandidateProfile candidate) {
        return candidateProfileRepository.save(candidate);
    }

    public void deleteCandidate(String name) {
        if (!candidateProfileRepository.findByCandidateName(name).isPresent()) {
            throw new RuntimeException("Candidate not found");
        }
        candidateProfileRepository.deleteByCandidateName(name);
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

    private void validateInterviewCompletion(String candidateEmail) {
        Optional<InterviewResult> interviewResult = interviewResultRepository.findByCandidateEmail(candidateEmail);
        if (!interviewResult.isPresent() || interviewResult.get().getAttempts() < 1) {
            throw new RuntimeException("Interview must be completed before making decisions");
        }
    }
}