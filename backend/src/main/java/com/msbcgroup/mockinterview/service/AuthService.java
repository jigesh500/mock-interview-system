package com.msbcgroup.mockinterview.service;

import com.msbcgroup.mockinterview.model.InterviewMeeting;
import com.msbcgroup.mockinterview.repository.InterviewMeetingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private InterviewMeetingRepository meetingRepository;

    public String determineUserRole(String email) {
        if (email != null && email.equals("jigesh.jethava@msbcgroup.com")) {
            return "hr";
        }
        return "candidate";
    }

    public boolean isValidInterviewToken(String token) {
        Optional<InterviewMeeting> meetingOpt = meetingRepository.findByLoginToken(token);
        
        return meetingOpt.isPresent() &&
               meetingOpt.get().getStatus() == InterviewMeeting.MeetingStatus.SCHEDULED &&
               (meetingOpt.get().getTokenExpiry() == null || 
                meetingOpt.get().getTokenExpiry().isAfter(LocalDateTime.now()));
    }
}