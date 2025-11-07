package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.service.VoiceAnalysisServiceNew;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/voice")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class VoiceController {
    
    @Autowired
    private VoiceAnalysisServiceNew voiceAnalysisService;
    
    @GetMapping("/test")
    public ResponseEntity<Map<String, String>> testConnection() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "Voice API is working");
        response.put("timestamp", java.time.LocalDateTime.now().toString());
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/store-baseline")
    public ResponseEntity<Map<String, Object>> storeVoiceBaseline(
            @RequestParam("audio") MultipartFile audioFile,
            @RequestParam("sessionId") String sessionId,
            @RequestParam("candidateEmail") String candidateEmail) {
        
        System.out.println("\n=== VOICE BASELINE STORAGE ===");
        System.out.println("Session ID: " + sessionId);
        System.out.println("Candidate Email: " + candidateEmail);
        System.out.println("Audio file size: " + audioFile.getSize() + " bytes");
        System.out.println("Audio file type: " + audioFile.getContentType());
        
        Map<String, Object> result = voiceAnalysisService.storeVoiceBaseline(
            audioFile, sessionId, candidateEmail);
            
        System.out.println("Baseline storage result: " + result);
        System.out.println("=== BASELINE STORAGE COMPLETE ===\n");
        
        return ResponseEntity.ok(result);
    }
    
    @PostMapping("/verify-unknown")
    public ResponseEntity<Map<String, Object>> verifyUnknownVoice(
            @RequestParam("audio") MultipartFile audioFile,
            @RequestParam("sessionId") String sessionId,
            @RequestParam("candidateEmail") String candidateEmail) {
        
        System.out.println("\n=== VOICE VERIFICATION REQUEST ===");
        System.out.println("Session ID: " + sessionId);
        System.out.println("Candidate Email: " + candidateEmail);
        System.out.println("Audio file size: " + audioFile.getSize() + " bytes");
        System.out.println("Audio file type: " + audioFile.getContentType());
        
        Map<String, Object> result = voiceAnalysisService.analyzeForUnknownVoice(
            audioFile, sessionId, candidateEmail);
            
        System.out.println("\n--- VERIFICATION RESULT ---");
        System.out.println("Violation detected: " + result.get("violation"));
        System.out.println("Message: " + result.get("message"));
        System.out.println("Confidence: " + result.get("confidence"));
        System.out.println("=== VERIFICATION COMPLETE ===\n");
        
        return ResponseEntity.ok(result);
    }
}