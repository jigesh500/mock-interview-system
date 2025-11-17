package com.msbcgroup.mockinterview.model;

import java.time.LocalDateTime;

public class ScheduleRequest {
    private String candidateEmail;
    private String interviewerEmail;
    private String interviewerName;
    private LocalDateTime scheduledDateTime;
    private String notes;

    // Getters and Setters
    public String getCandidateEmail() {
        return candidateEmail;
    }

    public void setCandidateEmail(String candidateEmail) {
        this.candidateEmail = candidateEmail;
    }

    public String getInterviewerEmail() {
        return interviewerEmail;
    }

    public void setInterviewerEmail(String interviewerEmail) {
        this.interviewerEmail = interviewerEmail;
    }

    public String getInterviewerName() {
        return interviewerName;
    }

    public void setInterviewerName(String interviewerName) {
        this.interviewerName = interviewerName;
    }

    public LocalDateTime getScheduledDateTime() {
        return scheduledDateTime;
    }

    public void setScheduledDateTime(LocalDateTime scheduledDateTime) {
        this.scheduledDateTime = scheduledDateTime;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
