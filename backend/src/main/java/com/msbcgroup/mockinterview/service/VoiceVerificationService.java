//package com.msbcgroup.mockinterview.service;
//
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.stereotype.Service;
//import org.springframework.web.multipart.MultipartFile;
//import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
//import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
//import software.amazon.awssdk.core.SdkBytes;
//import software.amazon.awssdk.regions.Region;
//import software.amazon.awssdk.services.voiceid.VoiceIdClient;
//import software.amazon.awssdk.services.voiceid.model.*;
//
//import java.util.HashMap;
//import java.util.Map;
//
//@Service
//public class VoiceVerificationService {
//
//    @Value("${aws.accessKeyId}")
//    private String awsAccessKeyId;
//    @Value("${aws.secretKey}")
//    private String awsSecretKey;
//    @Value("${aws.region}")
//    private String awsRegion;
//
//    // IMPORTANT: Replace this with your actual Voice ID Domain ID from the AWS Console
//    private static final String VOICE_ID_DOMAIN = "your-voice-id-domain-id";
//
//    private VoiceIdClient getVoiceIdClient() {
//        return VoiceIdClient.builder()
//                .region(Region.of(awsRegion))
//                .credentialsProvider(StaticCredentialsProvider.create(
//                        AwsBasicCredentials.create(awsAccessKeyId, awsSecretKey)))
//                .build();
//    }
//
//    /**
//     * Enrolls a speaker using the sessionId as the unique SpeakerId.
//     */
//    public String enrollSpeaker(String sessionId, MultipartFile audioFile) {
//        VoiceIdClient client = getVoiceIdClient();
//        try {
//            EnrollSpeakerRequest request = EnrollSpeakerRequest.builder()
//                    .domainId(VOICE_ID_DOMAIN)
//                    .speakerId(sessionId) // Using sessionId as a unique speakerId
//                    .data(SdkBytes.fromByteArray(audioFile.getBytes()))
//                    .build();
//
//            EnrollSpeakerResponse response = client.enrollSpeaker(request);
//            System.out.println("Successfully enrolled speaker: " + response.speaker().speakerId());
//            return response.speaker().speakerId();
//        } catch (ConflictException e) {
//            // Speaker already exists, which is fine. We can proceed.
//            System.out.println("Speaker " + sessionId + " already exists.");
//            return sessionId;
//        } catch (Exception e) {
//            System.err.println("Error enrolling speaker: " + e.getMessage());
//            throw new RuntimeException("Voice enrollment failed", e);
//        }
//    }
//
//    /**
//     * Evaluates a live audio chunk against an enrolled speaker.
//     * This is a simplified example. A real implementation would manage a session state.
//     */
//    public Map<String, Object> evaluateSpeaker(String sessionId, byte[] audioChunk) {
//        VoiceIdClient client = getVoiceIdClient();
//        try {
//            // In a real app, you would start a session and stream chunks to it.
//            // For this example, we'll use EvaluateSession which is less ideal but works for demonstration.
//            EvaluateSessionRequest request = EvaluateSessionRequest.builder()
//                    .domainId(VOICE_ID_DOMAIN)
//                    .sessionId(sessionId) // The session must be started in AWS
//                    .chunk(SdkBytes.fromByteArray(audioChunk))
//                    .build();
//
//            EvaluateSessionResponse response = client.evaluateSession(request);
//
//            Map<String, Object> result = new HashMap<>();
//            result.put("isMatch", response.decision().equals(AuthenticationDecision.ACCEPT));
//            result.put("score", response.confidenceScore() != null ? response.confidenceScore() : 0.0);
//            result.put("details", response.decision().toString());
//
//            return result;
//        } catch (Exception e) {
//            System.err.println("Error evaluating speaker: " + e.getMessage());
//            Map<String, Object> result = new HashMap<>();
//            result.put("isMatch", false);
//            result.put("score", 0.0);
//            result.put("details", "API_ERROR");
//            return result;
//        }
//    }
//}