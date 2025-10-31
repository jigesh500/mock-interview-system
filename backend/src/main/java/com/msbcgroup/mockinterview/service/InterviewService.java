package com.msbcgroup.mockinterview.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.msbcgroup.mockinterview.model.*;
import com.msbcgroup.mockinterview.repository.*;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class InterviewService {

    @Autowired
    private InterviewSessionRepository sessionRepository;

    @Autowired
    private InterviewMeetingRepository meetingRepository;

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private InterviewResultRepository interviewResultRepository;

    @Autowired
    private InterviewSummaryRepository interviewSummaryRepository;

    @Autowired
    private MonitoringEventRepository eventRepository;

    private final ChatClient chatClient;

    public InterviewService(ChatClient.Builder chatClient) {
        this.chatClient = chatClient.build();
    }

    public Map<String, Object> scheduleInterview(String candidateEmail) throws Exception {
        CandidateProfile profile = candidateProfileRepository.findByCandidateEmail(candidateEmail)
                .orElseThrow(() -> new RuntimeException("Candidate profile not found for email: " + candidateEmail));

        if ("Pending".equals(profile.getOverallStatus())) {
            profile.setOverallStatus("In Progress");
            candidateProfileRepository.save(profile);
        }

        List<Question> questions = generateQuestionsFromProfile(profile);
        ObjectMapper mapper = new ObjectMapper();
        String questionsJson = mapper.writeValueAsString(questions);

        InterviewSession session = new InterviewSession();
        String sessionId = UUID.randomUUID().toString();
        session.setSessionId(sessionId);
        session.setCandidateEmail(candidateEmail);
        session.setQuestionsJson(questionsJson);
        session.setCompleted(false);
        sessionRepository.save(session);

        String magicLink = "http://localhost:8081/api/auth/start-interview/" + sessionId;

        InterviewMeeting meeting = new InterviewMeeting();
        meeting.setMeetingUrl(magicLink);
        meeting.setCandidateEmail(candidateEmail);
        meeting.setStatus(InterviewMeeting.MeetingStatus.SCHEDULED);
        meeting.setLoginToken(sessionId);
        meeting.setTokenExpiry(LocalDateTime.now().plusHours(48));
        meetingRepository.save(meeting);

        Map<String, Object> response = new HashMap<>();
        response.put("magicLink", magicLink);
        response.put("message", "Interview scheduled successfully.");
        return response;
    }

    public Map<String, Object> getInterviewSummary(String candidateEmail) {
        Optional<InterviewResult> result = interviewResultRepository.findByCandidateEmail(candidateEmail);

        if (result.isPresent() && result.get().getSummary() != null) {
            Long summaryId = result.get().getSummary().getId();
            Optional<InterviewSummary> summary = interviewSummaryRepository.findById(summaryId);

            if (summary.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("score", summary.get().getScore());
                response.put("summary", summary.get().getSummary());
                return response;
            }
        }
        return null;
    }

    public Map<String, Object> scheduleSecondRound(String candidateEmail) {
        CandidateProfile candidate = candidateProfileRepository.findByCandidateEmail(candidateEmail)
                .orElseThrow(() -> new RuntimeException("Candidate not found"));

        if (!candidate.needsSecondRound()) {
            throw new RuntimeException("Candidate not eligible for second round");
        }

        candidate.setInterviewStatus("PENDING");
        candidateProfileRepository.save(candidate);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Second round scheduled successfully");
        return response;
    }

    public List<Question> generateQuestionsFromProfile(CandidateProfile profile) {
        String prompt = """
                    You are an interview question generator.
                    Generate exactly 30 interview questions tailored to the candidate's background.
                
                    Total questions must be 25 and **mix of types**:
                     - 25 Multiple-Choice (MCQ/OMR style) questions with 4 options each (do NOT include correct answers).
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
                
                   Other Constraints:
                    -Ensure a natural variety of question topics based on candidate's skills and Description.
                    -Ensure questions are concise, clear, and realistic.
                    -Generate fresh and unique questions each time, ensuring variety and creativity.
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
                profile.getSkills(), profile.getDescription());

        String response = chatClient.prompt()
                .user(prompt)
                .call()
                .content();

        try {
            return parseQuestions(response);
        } catch (Exception e) {
            System.err.println("Failed to parse questions from AI response: " + e.getMessage());
            throw new RuntimeException("Error generating interview questions from AI service.", e);
        }
    }

    public Map<String, Object> submitAnswers(Map<String, Object> requestBody) throws JsonProcessingException {
        String sessionId = (String) requestBody.get("sessionId");
        Map<String, String> answers = (Map<String, String>) requestBody.get("answers");

        InterviewSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found with id: " + sessionId));

        String email = session.getCandidateEmail();
        ObjectMapper mapper = new ObjectMapper();
        List<Question> questions = mapper.readValue(session.getQuestionsJson(),
                new TypeReference<List<Question>>() {});

        session.setCompleted(true);
        sessionRepository.save(session);

        List<InterviewMeeting> activeMeetings = meetingRepository.findAllByCandidateEmailAndStatus(
                email, InterviewMeeting.MeetingStatus.SCHEDULED);
        activeMeetings.forEach(meeting -> {
            meeting.setStatus(InterviewMeeting.MeetingStatus.COMPLETED);
            meeting.setLoginToken(null);
            meeting.setTokenExpiry(null);
        });
        meetingRepository.saveAll(activeMeetings);

        Map<String, String> userAnswerMap = new HashMap<>();
        for (int i = 0; i < questions.size(); i++) {
            String answer = answers.get("answer" + i);
            if (answer != null) {
                userAnswerMap.put(questions.get(i).getQuestion(), answer);
            }
        }

        List<MonitoringEvent> allEvents = eventRepository.findAllEventsBySessionId(sessionId);
        String reviewPrompt = buildReviewPrompt(questions, userAnswerMap, allEvents);
        String aiResponse = chatClient.prompt().user(reviewPrompt).call().content();
        InterviewSummary summary = parseAiSummary(aiResponse);

        Optional<InterviewResult> existingResultOpt = interviewResultRepository.findByCandidateEmail(email);
        if (existingResultOpt.isPresent()) {
            InterviewResult existingResult = existingResultOpt.get();
            existingResult.setAttempts(existingResult.getAttempts() + 1);
            existingResult.setSubmittedAt(LocalDateTime.now());
            existingResult.setSummary(summary);
            interviewResultRepository.save(existingResult);
        } else {
            InterviewResult result = new InterviewResult(email, summary);
            interviewResultRepository.save(result);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Interview submitted successfully");
        response.put("sessionId", sessionId);
        return response;
    }

    public Map<String, Object> startWithSession(String sessionId) throws JsonProcessingException {
        InterviewSession session = sessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (session.isCompleted()) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Conflict");
            errorResponse.put("message", "This interview session has already been completed.");
            return errorResponse;
        }

        ObjectMapper mapper = new ObjectMapper();
        List<Question> questions = mapper.readValue(session.getQuestionsJson(),
                new TypeReference<List<Question>>() {});

        Map<String, Object> response = new HashMap<>();
        response.put("questions", questions);
        response.put("sessionId", sessionId);
        return response;
    }

    private List<Question> parseQuestions(String response) {
        try {
            if (response.startsWith("`")) {
                response = response.replaceAll("`json", "").replaceAll("`", "").trim();
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

    private String buildReviewPrompt(List<Question> questions, Map<String, String> answers, List<MonitoringEvent> events) {
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

        Map<MonitoringEvent.EventType, Long> violationCounts = events.stream()
                .filter(e -> e.getEventType() == MonitoringEvent.EventType.FACE_NOT_DETECTED
                        || e.getEventType() == MonitoringEvent.EventType.MULTIPLE_FACES
                        || e.getEventType() == MonitoringEvent.EventType.TAB_SWITCH)
                .collect(Collectors.groupingBy(MonitoringEvent::getEventType, Collectors.counting()));

        if (!violationCounts.isEmpty()) {
            prompt.append("During the interview, the following violations occurred:\n");
            violationCounts.forEach((type, count) ->
                    prompt.append(type).append(": ").append(count).append(" time(s)\n")
            );
            prompt.append("\n");
        }

        prompt.append("""
                You are an experienced technical interviewer. Review the candidate's exam answers and generate a structured evaluation.
        
        SCORING INSTRUCTIONS:
        - Total questions: 25 (20 MCQ + 5 coding)
        - Each question is worth exactly 1 point
        - No negative marking
        - Score range: 0-25
        
        For MCQ questions:
        - Award 1 point if the selected option matches the correct answer
        - Award 0 points if incorrect or no answer provided
        
        For coding questions:
        - Award 1 point if the solution demonstrates correct logic and approach
        - Award 0 points if the logic is fundamentally flawed or no solution provided
        - Minor syntax errors should not result in 0 points if the approach is correct
        
        VIOLATIONS:
        - Do NOT deduct points for violations
        - Mention violations in the summary field as observational data
        - Consider violations only in the recommendation, not the score
        
        EVALUATION GUIDELINES:
        - Do NOT mention specific questions or answers in the summary
        - Provide only a high-level evaluation of performance
        - Include any violations and their frequency directly in the "summary" field
        
        If the candidate score is above average (score >= 15), include in the summary:
        - Areas where the candidate is strong
        - Areas where the candidate can improve
        
        Output strictly in JSON format:
        {
          "score": [Number 0-25],
          "summary": "[One sentence summary including performance, strengths, weaknesses, and violations]",
          "strengths": "[3 bullet points separated by |]",
          "improvements": "[3 bullet points separated by |]",
          
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
}