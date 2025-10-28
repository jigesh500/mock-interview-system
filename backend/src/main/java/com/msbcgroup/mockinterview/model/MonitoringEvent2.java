//package com.msbcgroup.mockinterview.model;
//
//import jakarta.persistence.*;
//import java.time.LocalDateTime;
//
////@Entity
////@Table(name = "monitoring_event")
//public class MonitoringEvent2 {
//
//    @Id
//    @GeneratedValue(strategy = GenerationType.IDENTITY)
//    private Long id;
//
//    @Column(nullable = false)
//    private String sessionId;
//
//    @Column(nullable = false)
//    private String candidateEmail;
//
//    @Enumerated(EnumType.STRING)
//    @Column(length = 25)
//    private EventType eventType;
//
//    private String description;
//    private String metadata; // JSON data
//    private LocalDateTime timestamp;
//
//    // --- MODIFIED SECTION ---
//    // Added new event types for voice verification
//    public enum EventType {
//        FACE_NOT_DETECTED,
//        MULTIPLE_FACES,
//        FACE_DETECTED,
//        TAB_SWITCH,
//        WINDOW_BLUR,
//        INTERVIEW_START,
//        INTERVIEW_END,
//        INTERVIEW_TERMINATED,
//
//        // --- NEW VOICE EVENTS ---
//        VOICE_ENROLLMENT_SUCCESS,
//        VOICE_ENROLLMENT_FAILED,
//        DIFFERENT_VOICE_DETECTED
//    }
//    // --- END OF MODIFIED SECTION ---
//
//    public MonitoringEvent2() {
//        this.timestamp = LocalDateTime.now();
//    }
//
//    // Getters and setters
//    public Long getId() { return id; }
//    public void setId(Long id) { this.id = id; }
//
//    public String getSessionId() { return sessionId; }
//    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
//
//    public String getCandidateEmail() { return candidateEmail; }
//    public void setCandidateEmail(String candidateEmail) { this.candidateEmail = candidateEmail; }
//
//    public EventType getEventType() { return eventType; }
//    public void setEventType(EventType eventType) { this.eventType = eventType; }
//
//    public String getDescription() { return description; }
//    public void setDescription(String description) { this.description = description; }
//
//    public String getMetadata() { return metadata; }
//    public void setMetadata(String metadata) { this.metadata = metadata; }
//
//    public LocalDateTime getTimestamp() { return timestamp; }
//    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
//}