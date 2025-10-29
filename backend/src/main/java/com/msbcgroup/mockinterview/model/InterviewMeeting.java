package com.msbcgroup.mockinterview.model;

import jakarta.persistence.*;
import org.yaml.snakeyaml.events.Event;

import java.time.LocalDateTime;

@Entity
@Table(name="interview_meeting")
public class InterviewMeeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String candidateEmail;
    private String hrEmail;
    private String meetingUrl;
    private LocalDateTime createdAt;
    @Enumerated(EnumType.STRING)
    private MeetingStatus status = MeetingStatus.PENDING;

    @Column(unique = true)
    private String loginToken;

    private LocalDateTime tokenExpiry;

    public enum MeetingStatus {
        PENDING, SCHEDULED, COMPLETED
    }


    public InterviewMeeting() {
        this.createdAt = LocalDateTime.now();
    }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getHrEmail() { return hrEmail; }
    public void setHrEmail(String hrEmail) { this.hrEmail = hrEmail; }

    public String getCandidateEmail() { return candidateEmail; }
    public void setCandidateEmail(String candidateEmail) { this.candidateEmail = candidateEmail; }

    public String getMeetingUrl() { return meetingUrl; }
    public void setMeetingUrl(String meetingUrl) { this.meetingUrl = meetingUrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public MeetingStatus getStatus() {
        return status;
    }

    public void setStatus(MeetingStatus status) {
        this.status = status;
    }

    public String getLoginToken() {
        return loginToken;
    }

    public void setLoginToken(String loginToken) {
        this.loginToken = loginToken;
    }

    public LocalDateTime getTokenExpiry() {
        return tokenExpiry;
    }

    public void setTokenExpiry(LocalDateTime tokenExpiry) {
        this.tokenExpiry = tokenExpiry;
    }
}
