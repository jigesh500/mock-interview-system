package com.msbcgroup.mockinterview.model;


import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "interview_results")
public class InterviewResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String candidateEmail;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "summary_id")
    private InterviewSummary summary;

    private Integer attempts = 1;

    @Column(nullable = false)
    private LocalDateTime submittedAt;

    public InterviewResult() {}

    public InterviewResult(String candidateEmail, InterviewSummary summary) {
        this.candidateEmail = candidateEmail;
        this.summary = summary;
        this.submittedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCandidateEmail() { return candidateEmail; }
    public void setCandidateEmail(String candidateEmail) { this.candidateEmail = candidateEmail; }

    public InterviewSummary getSummary() { return summary; }
    public void setSummary(InterviewSummary summary) { this.summary = summary; }

    public Integer getAttempts() { return attempts; }
    public void setAttempts(Integer attempts) { this.attempts = attempts; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }
}