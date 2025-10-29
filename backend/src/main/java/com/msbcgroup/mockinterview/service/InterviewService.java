package com.msbcgroup.mockinterview.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.msbcgroup.mockinterview.controller.InterviewController;
import com.msbcgroup.mockinterview.model.*;
import com.msbcgroup.mockinterview.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class InterviewService {

    @Autowired
    private InterviewSessionRepository sessionRepository;
    
    @Autowired
    private InterviewMeetingRepository meetingRepository;
    
    @Autowired
    private CandidateProfileRepository candidateProfileRepository;
    
    @Autowired
    private InterviewResultRepository interviewResultRepository;
    
    @Autowired
    private InterviewSummaryRepository interviewSummaryRepository;
    
    @Autowired
    private InterviewController interviewController;

    public String scheduleInterview(String candidateEmail) throws Exception {
        CandidateProfile profile = candidateProfileRepository.findByCandidateEmail(candidateEmail)
                .orElseThrow(() -> new RuntimeException("Candidate profile not found for email: " + candidateEmail));

        if ("Pending".equals(profile.getOverallStatus())) {
            profile.setOverallStatus("In Progress");
            candidateProfileRepository.save(profile);
        }

        List<Question> questions = interviewController.generateQuestionsFromProfile(profile);
        ObjectMapper mapper = new ObjectMapper();
        String questionsJson = mapper.writeValueAsString(questions);

        InterviewSession session = new InterviewSession();
        String sessionId = UUID.randomUUID().toString();
        session.setSessionId(sessionId);
        session.setCandidateEmail(candidateEmail);
        session.setQuestionsJson(questionsJson);
        session.setCompleted(false);
        sessionRepository.save(session);

        String magicLink = "http://localhost:8081/api/auth/start-interview/" + sessionId;

        InterviewMeeting meeting = new InterviewMeeting();
        meeting.setMeetingUrl(magicLink);
        meeting.setCandidateEmail(candidateEmail);
        meeting.setStatus(InterviewMeeting.MeetingStatus.SCHEDULED);
        meeting.setLoginToken(sessionId);
        meeting.setTokenExpiry(LocalDateTime.now().plusHours(48));
        meetingRepository.save(meeting);

        return magicLink;
    }

    public Map<String, Object> getInterviewSummary(String candidateEmail) {
        Optional<InterviewResult> result = interviewResultRepository.findByCandidateEmail(candidateEmail);
        
        if (result.isPresent() && result.get().getSummary() != null) {
            Long summaryId = result.get().getSummary().getId();
            Optional<InterviewSummary> summary = interviewSummaryRepository.findById(summaryId);
            
            if (summary.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("score", summary.get().getScore());
                response.put("summary", summary.get().getSummary());
                return response;
            }
        }
        return null;
    }

    public void scheduleSecondRound(String candidateEmail) {
        CandidateProfile candidate = candidateProfileRepository.findByCandidateEmail(candidateEmail)
                .orElseThrow(() -> new RuntimeException("Candidate not found"));

        if (!candidate.needsSecondRound()) {
            throw new RuntimeException("Candidate not eligible for second round");
        }

        candidate.setInterviewStatus("PENDING");
        candidateProfileRepository.save(candidate);
    }
}