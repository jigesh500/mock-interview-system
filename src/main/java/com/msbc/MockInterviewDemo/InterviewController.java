package com.msbc.MockInterviewDemo;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;

@Controller
@RequestMapping("/interview")
public class InterviewController {

    @Autowired
    private InterviewResultRepository interviewResult;

    private final ChatClient chatClient;
    private final Map<String, List<Question>> userQuestions = new HashMap<>();

    public InterviewController(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @GetMapping("/upload")
    public String uploadPage() {
        return "upload-resume";
    }

    @PostMapping("/generate-questions")
    public String generateQuestions(@RequestParam("resume") MultipartFile resume,
                                    @RequestParam("userId") String userId,
                                    Model model) throws Exception {

        String resumeText = extractPdfText(resume.getInputStream());
        String randomSeed = UUID.randomUUID().toString().substring(0, 8);
        String prompt = """
                    You are an interview question generator.
                    Generate exactly 10 interview questions tailored to the candidate's background.
                
                    The questions must be a **mix of types**:
                     - 8 Multiple-Choice (MCQ/OMR style) questions with 4 options each (do NOT include correct answers).
                     - 2 Coding/Practical problems (short coding challenges, debugging tasks, or logic-based coding exercises).
                
                    Adjust difficulty based on experience:
                     - 0–1 years → Mostly beginner-friendly, fundamentals, basic coding.
                     - 2–4 years → Intermediate difficulty, problem-solving, OOP, APIs, SQL, algorithms.
                     - 5+ years → Advanced design, optimization, system design, scaling, architecture-level coding problems.
                
                    Cover a variety of relevant topics from the resume:%s
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
                
                """.formatted(resumeText, randomSeed);

        String response = chatClient.prompt()
                .user(prompt)
                .call()
                .content();

        List<Question> questions = parseQuestions(response);
        userQuestions.put(userId, questions);
        model.addAttribute("questions", questions);
        model.addAttribute("userId", userId);

        return "interview-exam";
    }

    @PostMapping("/submit-answers")
    public String submitAnswers(@RequestParam Map<String, String> answers,
                                @RequestParam("userId") String userId,
                                @AuthenticationPrincipal OAuth2User principal,
                                Model model) {

        String email = principal.getAttribute("email");
        Map<String, String> userAnswerMap = new HashMap<>();
        List<Question> questions = userQuestions.get(userId);

        for (int i = 0; i < questions.size(); i++) {
            String answer = answers.get("answer" + i);
            if (answer != null) {
                userAnswerMap.put(questions.get(i).getQuestion(), answer);
            }
        }

        String reviewPrompt = buildReviewPrompt(questions.stream().map(Question::getQuestion).toList(), userAnswerMap);
        String aiResponse = chatClient.prompt()
                .user(reviewPrompt)
                .call()
                .content();

        InterviewSummary summary = parseAiSummary(aiResponse);
        
        InterviewResult existingResult = interviewResult.findByCandidateEmail(email);
        if(existingResult != null) {
            existingResult.setAttempts(existingResult.getAttempts() + 1);
            existingResult.setSubmittedAt(LocalDateTime.now());
            existingResult.setSummary(summary);
            interviewResult.save(existingResult);
        } else {
            InterviewResult result = new InterviewResult(email, summary);
            interviewResult.save(result);
        }

        model.addAttribute("summary", summary);
        model.addAttribute("questions", questions.stream().map(Question::getQuestion).toList());
        model.addAttribute("answers", userAnswerMap);

        return "interview-results";
    }

    private List<Question> parseQuestions(String response) {
        try {
            if (response.startsWith("```")) {
                response = response.replaceAll("```json", "").replaceAll("```", "").trim();
            }

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response);

            if (root.has("questions")) {
                return mapper.convertValue(root.get("questions"), new TypeReference<List<Question>>() {});
            }

            if (root.isArray()) {
                return mapper.convertValue(root, new TypeReference<List<Question>>() {});
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

    private String extractPdfText(InputStream pdfInputStream) throws Exception {
        try (PDDocument document = PDDocument.load(pdfInputStream)) {
            PDFTextStripper pdfStripper = new PDFTextStripper();
            return pdfStripper.getText(document);
        }
    }
}