package com.msbcgroup.mockinterview.service.ai;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class ChatClientAIService implements AIService{
    private final ChatClient chatClient;

    public ChatClientAIService(ChatClient.Builder chatClient) {
        this.chatClient = chatClient.build();
    }

    @Override
    public String generateQuestions(String prompt) {
        return chatClient.prompt().user(prompt).call().content();
    }

    @Override
    public String evaluateAnswers(String prompt) {
        return chatClient.prompt().user(prompt).call().content();
    }


}
