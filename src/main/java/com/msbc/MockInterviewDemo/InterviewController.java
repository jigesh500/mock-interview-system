package com.msbc.MockInterviewDemo;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Controller
@RequestMapping("/interview")
public class InterviewController {

    private final ChatClient chatClient;
    private final Map<String, List<Question>> userQuestions = new HashMap<>();
    private final Map<String, Map<String, String>> userAnswers = new HashMap<>();

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
                                  Model model) throws IOException {
        
        String resumeText = new String(resume.getBytes());
        
        String randomSeed = UUID.randomUUID().toString().substring(0, 8);
        String prompt = """
            Generate exactly 5 UNIQUE interview questions (Session: %s). Return ONLY the questions in this format:
            
            Q1: [OMR question text]
            A) option1
            B) option2
            C) option3
            D) option4
            
            Q2: [OMR question text]
            A) option1
            B) option2
            C) option3
            D) option4
            
            Q3: [Coding question text]
            
            Q4: [Coding question text]
            
            Q5: [Theory question text]
            
            Make questions varied and different from common interview questions. Focus on practical scenarios.
            Resume: %s
            """.formatted(randomSeed, resumeText);

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
                              Model model) {
        
        Map<String, String> userAnswerMap = new HashMap<>();
        List<Question> questions = userQuestions.get(userId);
        
        for (int i = 0; i < questions.size(); i++) {
            String answer = answers.get("answer" + i);
            if (answer != null) {
                userAnswerMap.put(questions.get(i).getQuestion(), answer);
            }
        }
        
        userAnswers.put(userId, userAnswerMap);
        
        String reviewPrompt = buildReviewPrompt(questions.stream().map(Question::getQuestion).toList(), userAnswerMap);
        String aiReview = chatClient.prompt()
                .user(reviewPrompt)
                .call()
                .content();

        model.addAttribute("review", aiReview);
        model.addAttribute("questions", questions.stream().map(Question::getQuestion).toList());
        model.addAttribute("answers", userAnswerMap);
        
        return "interview-results";
    }

    private List<Question> parseQuestions(String response) {
        List<Question> questions = new ArrayList<>();
        
        // Remove any prefix text before questions
        String cleanResponse = response.replaceAll("(?s).*?(?=Q1:)", "");
        
        // Split by Q1:, Q2:, etc.
        String[] questionBlocks = cleanResponse.split("Q\\d+:");
        
        for (int i = 1; i < questionBlocks.length && i <= 5; i++) {
            String block = questionBlocks[i].trim();
            if (block.isEmpty()) continue;
            
            String type = i <= 2 ? "OMR" : (i <= 4 ? "CODING" : "THEORY");
            
            if (type.equals("OMR")) {
                // Parse OMR question
                String[] lines = block.split("\n");
                String questionText = lines[0].trim();
                List<String> options = new ArrayList<>();
                
                for (String line : lines) {
                    if (line.matches("^[A-D]\\).*")) {
                        options.add(line.substring(2).trim());
                    }
                }
                
                questions.add(new Question(type, questionText, 
                    options.isEmpty() ? new String[]{"Option A", "Option B", "Option C", "Option D"} : 
                    options.toArray(new String[0])));
            } else {
                // Parse coding/theory question
                String questionText = block.split("\n")[0].trim();
                questions.add(new Question(type, questionText, null));
            }
        }
        
        return questions;
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
            Provide a detailed review including:
            1. Overall Performance Score (1-10)
            2. Strengths demonstrated
            3. Areas for improvement
            4. Specific feedback for each answer
            5. Recommendation (Hire/Don't Hire/Further Interview)
            
            Format the response in a clear, professional manner.
            """);
        
        return prompt.toString();
    }
}