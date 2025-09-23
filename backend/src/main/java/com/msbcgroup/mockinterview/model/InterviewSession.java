package com.msbcgroup.mockinterview.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;


@Entity
@Table(name = "interview_session")
public class InterviewSession {

    @Id
    private String sessionId;

    @Column(nullable = false)
    private String candidateEmail;

    @Column(columnDefinition = "JSON")
    private String questionsJson;

    private LocalDateTime createdAt;
    private boolean completed = false;

    public InterviewSession() {
        this.createdAt = LocalDateTime.now();
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getCandidateEmail() {
        return candidateEmail;
    }

    public void setCandidateEmail(String candidateEmail) {
        this.candidateEmail = candidateEmail;
    }

    public String getQuestionsJson() {
        return questionsJson;
    }

    public void setQuestionsJson(String questionsJson) {
        this.questionsJson = questionsJson;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }
}
