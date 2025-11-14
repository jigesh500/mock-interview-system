package com.msbcgroup.mockinterview.service.ai;

public interface AIService {
    String generateQuestions(String prompt);
    String evaluateAnswers(String prompt);
}
