package com.msbcgroup.mockinterview.controller;


import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.msbcgroup.mockinterview.model.*;
import com.msbcgroup.mockinterview.repository.CandidateProfileRepository;
import com.msbcgroup.mockinterview.repository.InterviewResultRepository;
import com.msbcgroup.mockinterview.repository.InterviewSessionRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/interview")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class InterviewController {

    @Autowired
    private InterviewResultRepository interviewResult;

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private InterviewSessionRepository sessionRepository;

    private final ChatClient chatClient;

    public InterviewController(ChatClient.Builder chatClient) {
        this.chatClient = chatClient.build();
    }

    @GetMapping("/start")
    public ResponseEntity<Map<String, Object>> startInterview(@AuthenticationPrincipal OAuth2User principal) throws JsonProcessingException {
        String email = principal.getAttribute("email");

        //InterviewSession existingSession = sessionRepository.findByCandidateEmailAndCompleted(email, false);

//        if (existingSession != null) {
//            // Return existing session instead of creating new one
//            ObjectMapper mapper = new ObjectMapper();
//            List<Question> existingQuestions = mapper.readValue(existingSession.getQuestionsJson(),
//                    new TypeReference<List<Question>>() {
//                    });
//
//            Map<String, Object> response = new HashMap<>();
//            response.put("questions", existingQuestions);
//            response.put("sessionId", existingSession.getSessionId());
//            return ResponseEntity.ok(response);
//        }

        String sessionId = UUID.randomUUID().toString();


        CandidateProfile profile = candidateProfileRepository.findByCandidateEmail(email)
                .orElseThrow(() -> new RuntimeException("CandidateProfile not found for email: " + email));

        List<Question> questions = generateQuestionsFromProfile(profile);
        // Store complete questions as JSON
        ObjectMapper mapper = new ObjectMapper();
        String questionsJson = mapper.writeValueAsString(questions);

        InterviewSession session = new InterviewSession();
        session.setSessionId(sessionId);
        session.setCandidateEmail(email);
        session.setQuestionsJson(questionsJson);
        session.setCompleted(false);
        sessionRepository.save(session);

        Map<String, Object> response = new HashMap<>();
        response.put("questions", questions);
        response.put("sessionId", sessionId); // Use sessionId instead of userId

        return ResponseEntity.ok(response);
    }

    @PostMapping("/submit-answers")
    public ResponseEntity<Map<String, Object>> submitAnswers(
            @RequestBody Map<String, String> answers,
            @RequestParam("sessionId") String sessionId) throws JsonProcessingException {


        InterviewSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found with id: " + sessionId));

        String email = session.getCandidateEmail();
        ObjectMapper mapper = new ObjectMapper();
        List<Question> questions = mapper.readValue(session.getQuestionsJson(),
                new TypeReference<List<Question>>() {
                });
        session.setCompleted(true);
        sessionRepository.save(session);

        Map<String, String> userAnswerMap = new HashMap<>();

        for (int i = 0; i < questions.size(); i++) {
            String answer = answers.get("answer" + i);
            if (answer != null) {
                userAnswerMap.put(questions.get(i).getQuestion(), answer);
            }
        }

        // Generate AI review
        String reviewPrompt = buildReviewPrompt(questions, userAnswerMap);

        String aiResponse = chatClient.prompt()
                .user(reviewPrompt)
                .call()
                .content();

        InterviewSummary summary = parseAiSummary(aiResponse);

        // Save to DB
        InterviewResult existingResult = interviewResult.findByCandidateEmail(email);
        if (existingResult != null) {
            existingResult.setAttempts(existingResult.getAttempts() + 1);
            existingResult.setSubmittedAt(LocalDateTime.now());
            existingResult.setSummary(summary);
            interviewResult.save(existingResult);
        } else {
            InterviewResult result = new InterviewResult(email, summary);
            interviewResult.save(result);
        }

        // Return JSON instead of view
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Interview submitted successfully");

        return ResponseEntity.ok(response);
    }

    private List<Question> parseQuestions(String response) {
        try {
            if (response.startsWith("```")) {
                response = response.replaceAll("```json", "").replaceAll("```", "").trim();
            }

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response);

            if (root.has("questions")) {
                return mapper.convertValue(root.get("questions"), new TypeReference<List<Question>>() {
                });
            }

            if (root.isArray()) {
                return mapper.convertValue(root, new TypeReference<List<Question>>() {
                });
            }

            return new ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    private String buildReviewPrompt(List<Question> questions, Map<String, String> answers) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Please review this interview and provide a comprehensive summary:\n\n");

        for (Question question : questions) {
            String answer = answers.get(question.getQuestion());
            prompt.append("Question: ").append(question.getQuestion()).append("\n");

            if ("MCQ".equals(question.getType()) && question.getOptions() != null && !question.getOptions().isEmpty()) {
                prompt.append("Options: ").append(String.join(", ", question.getOptions())).append("\n");
            }

            prompt.append("Answer: ").append(answer != null ? answer : "No answer provided").append("\n\n");
        }

        prompt.append("""
                You are an experienced technical interviewer. Review the candidate's exam answers and generate a structured evaluation.
                
                For MCQ questions, evaluate if the selected option is correct.
                For coding questions, evaluate logic, syntax, and approach.
                
                Output strictly in JSON format:
                {
                  "score": [Number 1-10],
                  "summary": "[One sentence summary]",
                  "strengths": "[3 bullet points separated by |]",
                  "improvements": "[3 bullet points separated by |]", 
                  "recommendation": "[Hire/Further Interview/Don't Hire - One sentence]"
                }
                """);

        return prompt.toString();
    }

    private InterviewSummary parseAiSummary(String response) {
        try {
            if (response.startsWith("`")) {
                response = response.replaceAll("`json", "").replaceAll("`", "").trim();
            }

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response);

            int score = root.has("score") && !root.get("score").isNull() ? root.get("score").asInt() : 0;
            String summary = root.has("summary") && !root.get("summary").isNull() ? root.get("summary").asText() : "No summary available";
            String strengths = root.has("strengths") && !root.get("strengths").isNull() ? root.get("strengths").asText() : "No strengths identified";
            String improvements = root.has("improvements") && !root.get("improvements").isNull() ? root.get("improvements").asText() : "No improvements identified";
            String recommendation = root.has("recommendation") && !root.get("recommendation").isNull() ? root.get("recommendation").asText() : "No recommendation available";

            return new InterviewSummary(score, summary, strengths, improvements, recommendation);

        } catch (Exception e) {
            e.printStackTrace();
            return new InterviewSummary(0, "Error parsing summary", "", "", "");
        }
    }


    private CandidateProfile createSampleProfile(String email) {
        CandidateProfile profile = new CandidateProfile();
        profile.setCandidateEmail(email);
        profile.setCandidateName("smeet patel");
        profile.setPositionApplied("Python Developer");
        profile.setExperienceYears(1);
        profile.setSkills("Python, Django, Flask, REST APIs, SQL, Git");
        profile.setDescription("Passionate Python developer with 1 year of experience in building web applications using Django and Flask. Skilled in designing RESTful APIs and working with SQL databases. Familiar with version control using Git.");
        return profile;
    }

    private List<Question> generateQuestionsFromProfile(CandidateProfile profile) {

        String randomSeed = UUID.randomUUID().toString().substring(0, 8);

        String prompt = """
                    You are an interview question generator.
                    Generate exactly 10 interview questions tailored to the candidate's background.
                
                    The questions must be a **mix of types**:
                     - 8 Multiple-Choice (MCQ/OMR style) questions with 4 options each (do NOT include correct answers).
                     - 2 Coding/Practical problems (short coding challenges, debugging tasks, or logic-based coding exercises).
                
                    Candidate Profile:
                    positionApplied: %s
                    Experience: %d years
                    Skills: %s
                    Description: %s
                
                    Adjust difficulty based on experience:
                     - 0–1 years → Mostly beginner-friendly, fundamentals, basic coding.
                     - 2–4 years → Intermediate difficulty, problem-solving, OOP, APIs, SQL, algorithms.
                     - 5+ years → Advanced design, optimization, system design, scaling, architecture-level coding problems.
                
                
                    Ensure variety and randomness: use seed %s to make questions unique 
                    Ensure each question is concise, clear, and unambiguous.
                
                    Output strictly in JSON format only, no explanations.
                JSON format:
                {
                  "questions": [
                    {
                      "id": "Q1",
                      "type": "MCQ",
                      "question": "...",
                      "options": ["A) ...", "B) ...", "C) ...", "D) ..."]
                    },
                    {
                      "id": "Q6",
                      "type": "Coding",
                      "question": "..."
                    }
                  ]
                }
                
                """.formatted(profile.getPositionApplied(), profile.getExperienceYears(),
                profile.getSkills(), profile.getDescription(), randomSeed);

        String response = chatClient.prompt()
                .user(prompt)
                .call()
                .content();

        return parseQuestions(response);

    }


}