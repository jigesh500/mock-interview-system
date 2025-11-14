package com.msbcgroup.mockinterview.dto;

public class InterviewScheduleResponse {

    private String magicLink;
    private String message;
    private String sessionId;

    public InterviewScheduleResponse(String magicLink, String message, String sessionId) {
        this.magicLink = magicLink;
        this.message = message;
        this.sessionId = sessionId;
    }

    // getters and setters
    public String getMagicLink() { return magicLink; }
    public void setMagicLink(String magicLink) { this.magicLink = magicLink; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
}
