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

    private String meetingId;
    private String candidateEmail;
    private String hrEmail;
    private String meetingUrl;
    private LocalDateTime createdAt;
    private boolean active=true;

    public InterviewMeeting() {
        this.createdAt = LocalDateTime.now();
    }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMeetingId() { return meetingId; }
    public void setMeetingId(String meetingId) { this.meetingId = meetingId; }

    public String getHrEmail() { return hrEmail; }
    public void setHrEmail(String hrEmail) { this.hrEmail = hrEmail; }

    public String getCandidateEmail() { return candidateEmail; }
    public void setCandidateEmail(String candidateEmail) { this.candidateEmail = candidateEmail; }

    public String getMeetingUrl() { return meetingUrl; }
    public void setMeetingUrl(String meetingUrl) { this.meetingUrl = meetingUrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
