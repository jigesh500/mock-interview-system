package com.msbcgroup.mockinterview.model;


import jakarta.persistence.*;

@Entity
@Table(name = "interview_summary")
public class    InterviewSummary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(mappedBy = "summary")
    private InterviewResult interviewResult;

    private Integer score;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(columnDefinition = "TEXT")
    private String strengths;

    @Column(columnDefinition = "TEXT")
    private String improvements;



    public InterviewSummary() {}

    public InterviewSummary(Integer score, String summary, String strengths, String improvements, String recommendation) {
        this.score = score;
        this.summary = summary;
        this.strengths = strengths;
        this.improvements = improvements;

    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getStrengths() { return strengths; }
    public void setStrengths(String strengths) { this.strengths = strengths; }

    public String getImprovements() { return improvements; }
    public void setImprovements(String improvements) { this.improvements = improvements; }



    public InterviewResult getInterviewResult() { return interviewResult; }
    public void setInterviewResult(InterviewResult interviewResult) { this.interviewResult = interviewResult; }

    public String getCandidateEmail() {
        return interviewResult != null ? interviewResult.getCandidateEmail() : null;
    }
}