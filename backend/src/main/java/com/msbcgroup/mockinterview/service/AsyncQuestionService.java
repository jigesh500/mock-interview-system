package com.msbcgroup.mockinterview.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.msbcgroup.mockinterview.model.CandidateProfile;
import com.msbcgroup.mockinterview.model.InterviewSession;
import com.msbcgroup.mockinterview.model.Question;
import com.msbcgroup.mockinterview.repository.InterviewSessionRepository;
import com.msbcgroup.mockinterview.service.ai.AIService;
import com.msbcgroup.mockinterview.service.question.QuestionPromptFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AsyncQuestionService {
    
    @Autowired
    private InterviewSessionRepository sessionRepository;
    
    @Autowired
    private AIService aiService;
    
    @Autowired
    private QuestionPromptFactory questionPromptFactory;
    
    @Async("taskExecutor")
    public void generateQuestionsAsync(String sessionId, CandidateProfile profile) {
        System.out.println("[" + Thread.currentThread().getName() + "] Starting async question generation for session: " + sessionId);
        try {
            String prompt = questionPromptFactory.createPrompt(profile);
            String response = aiService.generateQuestions(prompt);
            List<Question> questions = parseQuestions(response);
            
            ObjectMapper mapper = new ObjectMapper();
            String questionsJson = mapper.writeValueAsString(questions);
            
            // Update session with generated questions
            InterviewSession session = sessionRepository.findBySessionId(sessionId).orElse(null);
            if (session != null) {
                session.setQuestionsJson(questionsJson);
                sessionRepository.save(session);
                System.out.println("[" + Thread.currentThread().getName() + "] Questions generated and saved for session: " + sessionId);
            }
        } catch (Exception e) {
            System.err.println("Failed to generate questions async: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    private List<Question> parseQuestions(String response) {
        try {
            if (response.startsWith("`")) {
                response = response.replaceAll("`json", "").replaceAll("`", "").trim();
            }

            ObjectMapper mapper = new ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(response);

            if (root.has("questions")) {
                return mapper.convertValue(root.get("questions"), new com.fasterxml.jackson.core.type.TypeReference<List<Question>>() {
                });
            }

            if (root.isArray()) {
                return mapper.convertValue(root, new com.fasterxml.jackson.core.type.TypeReference<List<Question>>() {
                });
            }

            return new java.util.ArrayList<>();
        } catch (Exception e) {
            e.printStackTrace();
            return new java.util.ArrayList<>();
        }
    }
}