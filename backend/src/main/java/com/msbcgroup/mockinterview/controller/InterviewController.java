package com.msbcgroup.mockinterview.controller;


import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.msbcgroup.mockinterview.model.CandidateProfile;
import com.msbcgroup.mockinterview.model.InterviewResult;
import com.msbcgroup.mockinterview.model.InterviewSummary;
import com.msbcgroup.mockinterview.model.Question;
import com.msbcgroup.mockinterview.repository.CandidateProfileRepository;
import com.msbcgroup.mockinterview.repository.InterviewResultRepository;
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

    private final ChatClient chatClient;
    private final Map<String, List<Question>> userQuestions = new HashMap<>();

    public InterviewController(ChatClient.Builder chatClient) {
        this.chatClient = chatClient.build();
    }

    @GetMapping("/start")
    public ResponseEntity<Map<String, Object>> startInterview(@AuthenticationPrincipal OAuth2User principal) {
        String email = principal.getAttribute("email");

        CandidateProfile profile = candidateProfileRepository.findByCandidateEmail(email);
        if (profile == null) {
            profile = createSampleProfile(email);
        }

        List<Question> questions = generateQuestionsFromProfile(profile);
        userQuestions.put(email, questions);

        Map<String, Object> response = new HashMap<>();
        response.put("questions", questions);
        response.put("userId", email);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/submit-answers")
    public ResponseEntity<Map<String, Object>> submitAnswers(
            @RequestBody Map<String, String> answers,
            @RequestParam("userId") String userId,
            @AuthenticationPrincipal OAuth2User principal) {

        String email = principal.getAttribute("email");
        Map<String, String> userAnswerMap = new HashMap<>();
        List<Question> questions = userQuestions.get(userId);

        for (int i = 0; i < questions.size(); i++) {
            String answer = answers.get("answer" + i);
            if (answer != null) {
                userAnswerMap.put(questions.get(i).getQuestion(), answer);
            }
        }

        // Generate AI review
        String reviewPrompt = buildReviewPrompt(
                questions.stream().map(Question::getQuestion).toList(),
                userAnswerMap
        );
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
        response.put("summary", summary);
        response.put("questions", questions.stream().map(Question::getQuestion).toList());
        response.put("answers", userAnswerMap);

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

    private String buildReviewPrompt(List<String> questions, Map<String, String> answers) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("Please review this interview and provide a comprehensive summary:\n\n");

        for (String question : questions) {
            String answer = answers.get(question);
            prompt.append("Question: ").append(question).append("\n");
            prompt.append("Answer: ").append(answer != null ? answer : "No answer provided").append("\n\n");
        }

        prompt.append("""
                You are an experienced technical interviewer. Review the candidate's exam answers and generate a structured evaluation.
                
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

            return new InterviewSummary(
                    root.get("score").asInt(),
                    root.get("summary").asText(),
                    root.get("strengths").asText(),
                    root.get("improvements").asText(),
                    root.get("recommendation").asText()
            );
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