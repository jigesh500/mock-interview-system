package com.msbcgroup.mockinterview.model;


import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "candidate_profile")
public class CandidateProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    private String candidateEmail;

    private String candidateName;

    private String positionApplied;

    private Integer experienceYears;

    @Column(columnDefinition = "TEXT")
    private String skills;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String phoneNumber;

    private String location;


    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    private RoundStatus firstRoundStatus;

    @Enumerated(EnumType.STRING)
    private RoundStatus secondRoundStatus;

    private Integer currentRound = 1;

    private LocalDateTime lastDecisionTimestamp;

    private String decisionMadeBy;

    private String interviewStatus = "PENDING";


    public CandidateProfile() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCandidateEmail() {
        return candidateEmail;
    }

    public void setCandidateEmail(String candidateEmail) {
        this.candidateEmail = candidateEmail;
    }

    public String getCandidateName() {
        return candidateName;
    }

    public void setCandidateName(String candidateName) {
        this.candidateName = candidateName;
    }

    public String getPositionApplied() {
        return positionApplied;
    }

    public void setPositionApplied(String positionApplied) {
        this.positionApplied = positionApplied;
    }

    public Integer getExperienceYears() {
        return experienceYears;
    }

    public void setExperienceYears(Integer experienceYears) {
        this.experienceYears = experienceYears;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public RoundStatus getFirstRoundStatus() {
        return firstRoundStatus;
    }

    public void setFirstRoundStatus(RoundStatus firstRoundStatus) {
        this.firstRoundStatus = firstRoundStatus;
    }

    public RoundStatus getSecondRoundStatus() {
        return secondRoundStatus;
    }

    public void setSecondRoundStatus(RoundStatus secondRoundStatus) {
        this.secondRoundStatus = secondRoundStatus;
    }

    public Integer getCurrentRound() {
        return currentRound;
    }

    public void setCurrentRound(Integer currentRound) {
        this.currentRound = currentRound;
    }

    public LocalDateTime getLastDecisionTimestamp() {
        return lastDecisionTimestamp;
    }

    public void setLastDecisionTimestamp(LocalDateTime lastDecisionTimestamp) {
        this.lastDecisionTimestamp = lastDecisionTimestamp;
    }

    public String getInterviewStatus() {
        return interviewStatus;
    }

    public void setInterviewStatus(String interviewStatus) {
        this.interviewStatus = interviewStatus;
    }

    public String getDecisionMadeBy() {
        return decisionMadeBy;
    }

    public void setDecisionMadeBy(String decisionMadeBy) {
        this.decisionMadeBy = decisionMadeBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    // Helper method to check if candidate needs second round
    public boolean needsSecondRound() {
        return this.firstRoundStatus == RoundStatus.PASS && 
               this.secondRoundStatus == RoundStatus.PENDING;
    }

    // Helper method to check if candidate can be evaluated
    public boolean canBeEvaluated() {
        return "Completed".equals(this.interviewStatus) && 
               !"Scheduled".equals(this.interviewStatus);
    }

}
