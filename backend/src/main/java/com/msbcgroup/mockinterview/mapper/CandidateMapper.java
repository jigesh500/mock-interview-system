package com.msbcgroup.mockinterview.mapper;

import com.msbcgroup.mockinterview.model.CandidateProfile;
import com.msbcgroup.mockinterview.model.InterviewMeeting;
import com.msbcgroup.mockinterview.model.InterviewResult;
import com.msbcgroup.mockinterview.repository.InterviewMeetingRepository;
import com.msbcgroup.mockinterview.repository.InterviewResultRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Component
public class CandidateMapper {
    
    @Autowired
    private InterviewResultRepository interviewResultRepository;
    
    @Autowired
    private InterviewMeetingRepository meetingRepository;
    
    public Map<String, Object> toBasicMap(CandidateProfile candidate) {
        Map<String, Object> data = new HashMap<>();
        data.put("candidateEmail", candidate.getCandidateEmail());
        data.put("candidateName", candidate.getCandidateName());
        data.put("firstRoundStatus", candidate.getFirstRoundStatus());
        data.put("secondRoundStatus", candidate.getSecondRoundStatus());
        data.put("currentRound", candidate.getCurrentRound());
        data.put("interviewStatus", candidate.getInterviewStatus());
        data.put("overallStatus", candidate.getOverallStatus());
        data.put("lastDecisionTimestamp", candidate.getLastDecisionTimestamp());
        data.put("decisionMadeBy", candidate.getDecisionMadeBy());
        return data;
    }
    
    public Map<String, Object> toDetailedMap(CandidateProfile candidate) {
        Map<String, Object> data = toBasicMap(candidate);
        data.put("id", candidate.getId());
        data.put("positionApplied", candidate.getPositionApplied());
        data.put("experienceYears", candidate.getExperienceYears());
        data.put("skills", candidate.getSkills());
        data.put("secondRoundInterviewerEmail", candidate.getSecondRoundInterviewerEmail());
        data.put("secondRoundInterviewerName", candidate.getSecondRoundInterviewerName());
        
        // Determine interview status
        String interviewStatus = determineInterviewStatus(candidate);
        data.put("interviewStatus", interviewStatus);
        
        // Add summary status
        Optional<InterviewResult> interviewResult = interviewResultRepository.findByCandidateEmail(candidate.getCandidateEmail());
        boolean hasSummary = interviewResult.isPresent() && interviewResult.get().getAttempts() >= 1;
        data.put("summaryStatus", hasSummary);
        
        // Add magic link
        Optional<InterviewMeeting> scheduledMeeting = meetingRepository.findAllByCandidateEmailAndStatus(
                candidate.getCandidateEmail(), InterviewMeeting.MeetingStatus.SCHEDULED)
                .stream().findFirst();
        data.put("magicLink", scheduledMeeting.map(InterviewMeeting::getMeetingUrl).orElse(null));
        
        return data;
    }
    
    private String determineInterviewStatus(CandidateProfile candidate) {
        Optional<InterviewResult> interviewResult = interviewResultRepository.findByCandidateEmail(candidate.getCandidateEmail());
        java.util.List<InterviewMeeting> activeMeetings = meetingRepository.findAllByCandidateEmailAndStatus(
                candidate.getCandidateEmail(), InterviewMeeting.MeetingStatus.SCHEDULED);

        if (!activeMeetings.isEmpty()) {
            return "Scheduled";
        } else if (interviewResult.isPresent() && interviewResult.get().getAttempts() >= 1) {
            return "Completed";
        } else {
            return "Pending";
        }
    }
}