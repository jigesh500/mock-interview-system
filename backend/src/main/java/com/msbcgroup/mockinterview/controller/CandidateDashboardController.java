package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.service.CandidateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/candidate")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class CandidateDashboardController {

    @Autowired
    private CandidateService candidateService;

    @GetMapping("/portal-info/{sessionId}")
    public ResponseEntity<Map<String, Object>> getInterviewInfoBySession(@PathVariable String sessionId) {
        Map<String, Object> response = candidateService.getInterviewInfoBySession(sessionId);
        return ResponseEntity.ok(response);
    }
}
