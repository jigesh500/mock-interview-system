package com.msbcgroup.mockinterview.controller;


import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.msbcgroup.mockinterview.model.*;
import com.msbcgroup.mockinterview.repository.CandidateProfileRepository;
import com.msbcgroup.mockinterview.repository.InterviewMeetingRepository;
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

    @Autowired
    private InterviewMeetingRepository meetingRepository;

    private final ChatClient chatClient;

    public InterviewController(ChatClient.Builder chatClient) {
        this.chatClient = chatClient.build();
    }

    @GetMapping("/start")
    public ResponseEntity<Map<String, Object>> startInterview(@AuthenticationPrincipal OAuth2User principal) throws JsonProcessingException {

        if (principal == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "User not authenticated");
            return ResponseEntity.status(401).body(errorResponse);
        }

        String email = principal.getAttribute("email");


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
            @RequestParam("sessionId") String sessionId,
            @AuthenticationPrincipal OAuth2User principal) throws JsonProcessingException {

        if (principal == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "User not authenticated");
            return ResponseEntity.status(401).body(errorResponse);
        }


        InterviewSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found with id: " + sessionId));

        String email = session.getCandidateEmail();
        ObjectMapper mapper = new ObjectMapper();
        List<Question> questions = mapper.readValue(session.getQuestionsJson(),
                new TypeReference<List<Question>>() {
                });
        session.setCompleted(true);
        sessionRepository.save(session);
        List<InterviewMeeting> activeMeetings = meetingRepository.findAllByCandidateEmailAndStatus(email, InterviewMeeting.MeetingStatus.SCHEDULED);
        activeMeetings.forEach(meeting -> meeting.setStatus(InterviewMeeting.MeetingStatus.COMPLETED));
        meetingRepository.saveAll(activeMeetings);

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
        Optional<InterviewResult> existingResultOpt = interviewResult.findByCandidateEmail(email);
        if (existingResultOpt.isPresent()) {
            InterviewResult existingResult = existingResultOpt.get();
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
        response.put("sessionId", sessionId);

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
                
                If no answers are provided, the score must be 0.
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


    @GetMapping("/start-with-session")
    public ResponseEntity<Map<String, Object>> startWithSession(
            @RequestParam String sessionId,
            @AuthenticationPrincipal OAuth2User principal) throws JsonProcessingException {

        String email = principal.getAttribute("email");

        // Verify session exists
        InterviewSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (!session.getCandidateEmail().equals(email)) {
            throw new RuntimeException("Unauthorized access to session");
        }

        // Generate questions (existing logic)
        CandidateProfile profile = candidateProfileRepository.findByCandidateEmail(email)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        List<Question> questions = generateQuestionsFromProfile(profile);

        ObjectMapper mapper = new ObjectMapper();
        String questionsJson = mapper.writeValueAsString(questions);

        session.setQuestionsJson(questionsJson);
        sessionRepository.save(session);

        Map<String, Object> response = new HashMap<>();
        response.put("questions", questions);
        response.put("sessionId", sessionId);
        response.put("meetingId", session.getMeetingId());

        return ResponseEntity.ok(response);
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
                     - 20 Multiple-Choice (MCQ/OMR style) questions with 4 options each (do NOT include correct answers).
                     - 5 Coding/Practical problems (coding challenges, logic-based coding exercises solvable within 5–10 minutes).
                
                    Candidate Profile:
                    positionApplied: %s
                    Experience: %d years
                    Skills: %s
                    Description: %s
                
                    Adjust difficulty based on experience:
                    
                     - If experience ≤ 1 year → Use **Beginner Level**
                       Focus on: basic syntax, OOP fundamentals, simple algorithms, basic SQL, core language concepts.
                       Avoid: advanced design patterns, complex system design, concurrency, or scaling questions.
                
                     - If 2 ≤ experience ≤ 4 years → Use **Intermediate Level**
                       Focus on: real-world problem-solving, API usage, debugging, data structures, OOP design, RESTful services, SQL joins, small-scale architecture.
                
                     - If experience ≥ 5 years → Use **Advanced Level**
                       Focus on: system design, optimization, architecture, performance tuning, scalability, multithreading, design patterns, and advanced algorithms.
                
                   Other Constraints
                    
                    -Ensure a natural variety of question topics based on candidate's skills and Description.
                    -Ensure questions are concise, clear, and realistic.
                    -Use the seed %s to maintain randomness and reproducibility.
                    -Do NOT include any explanations or answers.
                    
                
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