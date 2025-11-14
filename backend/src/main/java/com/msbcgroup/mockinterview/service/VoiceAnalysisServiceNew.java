package com.msbcgroup.mockinterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.msbcgroup.mockinterview.model.VoiceBaseline;
import com.msbcgroup.mockinterview.repository.VoiceBaselineRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.multipart.MultipartFile;

import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Service
public class VoiceAnalysisServiceNew {

    @Autowired
    private MonitoringService monitoringService;
    
    @Autowired
    private VoiceBaselineRepository voiceBaselineRepository;
    
    @Autowired
    private AudioConversionService audioConversionService;

    private final ChatClient chatClient;

    public VoiceAnalysisServiceNew(ChatClient.Builder chatClient) {
        this.chatClient = chatClient.build();
    }
    
    public Map<String, Object> storeVoiceBaseline(MultipartFile audioFile, 
                                                 String sessionId, 
                                                 String candidateEmail) {
        try {
            byte[] wavAudio = audioConversionService.convertToWav(audioFile);
            
            VoiceBaseline baseline = new VoiceBaseline();
            baseline.setCandidateEmail(candidateEmail);
            baseline.setSessionId(sessionId);
            baseline.setBaselineAudio(wavAudio);
            
            voiceBaselineRepository.save(baseline);
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Voice baseline stored successfully");
            return result;
            
        } catch (Exception e) {
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("error", e.getMessage());
            return result;
        }
    }

    @Async("voiceAnalysisExecutor")
    public CompletableFuture<Map<String, Object>> analyzeForUnknownVoiceAsync(MultipartFile audioFile,
                                                                              String sessionId,
                                                                              String candidateEmail) {
        Map<String, Object> result = analyzeForUnknownVoice(audioFile, sessionId, candidateEmail);
        return CompletableFuture.completedFuture(result);
    }

    public Map<String, Object> analyzeForUnknownVoice(MultipartFile audioFile,
                                                      String sessionId,
                                                      String candidateEmail) {
        try {
            // Skip analysis for very small audio files (likely silence)
            if (audioFile.getSize() < 2000) {
                Map<String, Object> result = new HashMap<>();
                result.put("violation", false);
                result.put("message", "Audio too small - likely silence");
                result.put("confidence", 0.1);
                return result;
            }
            
            Optional<VoiceBaseline> baselineOpt = voiceBaselineRepository.findByCandidateEmail(candidateEmail);
            if (!baselineOpt.isPresent()) {
                Map<String, Object> result = new HashMap<>();
                result.put("violation", true);
                result.put("message", "No voice baseline found");
                result.put("confidence", 0.8);
                
                monitoringService.logEvent(sessionId, candidateEmail,
                    "UNKNOWN_VOICE_DETECTED",
                    "No voice baseline found for candidate");
                return result;
            }
            
            byte[] currentWavAudio = audioConversionService.convertToWav(audioFile);
            byte[] baselineWavAudio = baselineOpt.get().getBaselineAudio();
            
            // Generate hash for caching
            String audioHash = generateAudioHash(currentWavAudio, baselineWavAudio);
            
            // Try to get cached result first
            Map<String, Object> cachedResult = getCachedVoiceAnalysis(audioHash);
            if (cachedResult != null) {
                System.out.println("Using cached voice analysis result");
                return cachedResult;
            }

            String prompt = "Compare voice samples and respond with JSON containing sameVoice boolean, additionalVoices boolean, confidence number, analysis string";

            String response = chatClient.prompt()
                    .user(userSpec -> userSpec
                            .text(prompt)
                            .media(MimeTypeUtils.parseMimeType("audio/wav"), new ByteArrayResource(baselineWavAudio))
                            .media(MimeTypeUtils.parseMimeType("audio/wav"), new ByteArrayResource(currentWavAudio)))
                    .call()
                    .content();

            String cleanedResponse = cleanJsonResponse(response);

            ObjectMapper mapper = new ObjectMapper();
            JsonNode analysis = mapper.readTree(cleanedResponse);

            boolean sameVoice = analysis.has("sameVoice") ?
                    analysis.get("sameVoice").asBoolean() : true;
            boolean additionalVoices = analysis.has("additionalVoices") ?
                    analysis.get("additionalVoices").asBoolean() : false;
            double confidence = analysis.has("confidence") ?
                    analysis.get("confidence").asDouble() : 0.0;

            Map<String, Object> result = new HashMap<>();
            
            if (!sameVoice || (additionalVoices && confidence > 0.7)) {
                System.out.println("\n🚨 VIOLATION DETECTED - Logging to database...");
                
                monitoringService.logEvent(sessionId, candidateEmail,
                        "UNKNOWN_VOICE_DETECTED",
                        "Voice verification failed");

                result.put("violation", true);
                result.put("message", "Unknown voice detected");
                
                System.out.println("✅ Violation logged successfully!");
            } else {
                System.out.println("\n✅ Voice verified - No violation detected");
                result.put("violation", false);
                result.put("message", "Voice verified");
            }

            result.put("confidence", confidence);
            
            // Cache the result for similar audio patterns
            cacheVoiceAnalysis(audioHash, result);
            
            return result;

        } catch (Exception e) {
            System.out.println("\n❌ VOICE ANALYSIS ERROR: " + e.getMessage());
            String errorMsg = e.getMessage();
            if (errorMsg != null && errorMsg.length() > 200) {
                errorMsg = errorMsg.substring(0, 200) + "...";
            }
            
            System.out.println("Logging error as violation to database...");
            monitoringService.logEvent(sessionId, candidateEmail,
                    "UNKNOWN_VOICE_DETECTED",
                    "Voice analysis failed - " + e.getMessage());

            Map<String, Object> result = new HashMap<>();
            result.put("violation", true);
            result.put("message", "Analysis failed");
            result.put("confidence", 0.3);
            return result;
        }
    }

    private String cleanJsonResponse(String response) {
        if (response == null) return "{}";

        // Remove markdown code blocks
        response = response.replaceAll("```json\\s*", "").replaceAll("```\\s*", "");

        // Remove leading/trailing whitespace
        response = response.trim();

        // If response doesn't start with {, try to find JSON within the response
        if (!response.startsWith("{")) {
            int jsonStart = response.indexOf("{");
            int jsonEnd = response.lastIndexOf("}");
            if (jsonStart != -1 && jsonEnd != -1 && jsonEnd > jsonStart) {
                response = response.substring(jsonStart, jsonEnd + 1);
            } else {
                // Fallback JSON if no valid JSON found
                return "{\"sameVoice\": true, \"additionalVoices\": false, \"confidence\": 0.5, \"analysis\": \"Parse error\"}";
            }
        }

        return response;
    }
    
    private String generateAudioHash(byte[] audio1, byte[] audio2) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            md.update(audio1);
            md.update(audio2);
            byte[] digest = md.digest();
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return String.valueOf(audio1.length + audio2.length);
        }
    }
    
    @Cacheable(value = "voiceAnalysis", key = "#audioHash")
    public Map<String, Object> getCachedVoiceAnalysis(String audioHash) {
        return null; // Cache miss - will be populated by cacheVoiceAnalysis
    }
    
    private void cacheVoiceAnalysis(String audioHash, Map<String, Object> result) {
        // This method helps with cache population
        // The actual caching is handled by Spring's @Cacheable annotation
    }
}