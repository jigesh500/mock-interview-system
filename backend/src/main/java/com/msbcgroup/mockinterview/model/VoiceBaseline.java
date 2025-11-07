package com.msbcgroup.mockinterview.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "voice_baseline")
public class VoiceBaseline {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String candidateEmail;
    
    @Column(nullable = false)
    private String sessionId;
    
    @Lob
    @Column(nullable = false, columnDefinition = "LONGBLOB")
    private byte[] baselineAudio; // WAV format
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    public VoiceBaseline() {
        this.createdAt = LocalDateTime.now();
    }
    
    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getCandidateEmail() { return candidateEmail; }
    public void setCandidateEmail(String candidateEmail) { this.candidateEmail = candidateEmail; }
    
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    
    public byte[] getBaselineAudio() { return baselineAudio; }
    public void setBaselineAudio(byte[] baselineAudio) { this.baselineAudio = baselineAudio; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}