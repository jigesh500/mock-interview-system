package com.msbcgroup.mockinterview.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.msbcgroup.mockinterview.service.InterviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/interview")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class InterviewController {

    @Autowired
    private InterviewService interviewService;

    @PostMapping("/submit-answers")
    public ResponseEntity<Map<String, Object>> submitAnswers(
            @RequestBody Map<String, Object> requestBody) throws JsonProcessingException {
        Map<String, Object> response = interviewService.submitAnswers(requestBody);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/start-with-session/{sessionId}")
    public ResponseEntity<Map<String, Object>> startWithSession(
            @PathVariable String sessionId) throws JsonProcessingException {
        Map<String, Object> response = interviewService.startWithSession(sessionId);

        if (response.containsKey("error") && "Conflict".equals(response.get("error"))) {
            return ResponseEntity.status(409).body(response);
        }

        return ResponseEntity.ok(response);
    }
}