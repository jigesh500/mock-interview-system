package com.msbcgroup.mockinterview.dto;

public class InterviewSummaryResponse {
    private int score;
    private String summary;

    public InterviewSummaryResponse(int score, String summary) {
        this.score = score;
        this.summary = summary;
    }

    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
}
