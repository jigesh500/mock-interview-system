package com.msbcgroup.mockinterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class ResumeParsingService {

    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    public ResumeParsingService(ChatClient chatClient) {
        this.chatClient = chatClient;
        this.objectMapper = new ObjectMapper();
    }

    public JsonNode parseResume(String resumeText) {
        // Debug input
        System.out.println("Resume text length: " + (resumeText != null ? resumeText.length() : "null"));
        System.out.println("Resume text preview: " + (resumeText != null ? resumeText.substring(0, Math.min(200, resumeText.length())) : "null"));
        
        if (resumeText == null || resumeText.trim().isEmpty()) {
            throw new RuntimeException("Resume text is empty or null");
        }
        String prompt = """
            Parse this resume and return a JSON object with ALL these fields filled:
            
            {
              "name": "John Doe",
              "email": "john@email.com",
              "phone": "+1234567890",
              "position": "Software Engineer",
              "experience": 3,
              "skills": "Java, Python, React",
              "location": "New York, NY",
              "description": "Experienced software engineer with 3 years in web development"
            }
            
            RULES:
            - Extract actual values from resume
            - NEVER leave description empty - always write something
            - If experienced: "[Name] is a [position] with [X] years of experience in [key skills/areas]"
            - If fresher: "[Name] is a recent graduate/fresher with skills in [relevant skills]"
            - Return only valid JSON
            
            Resume:
            """ + resumeText;

        try {
            String response = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();

            System.out.println("Raw AI Response: " + response);
            
            // Clean response
            response = response.trim();
            if (response.contains("```json")) {
                response = response.replaceAll(".*```json\\s*", "").replaceAll("```.*", "").trim();
            } else if (response.contains("```")) {
                response = response.replaceAll("```", "").trim();
            }
            
            System.out.println("Cleaned AI Response: " + response);
            
            JsonNode result = objectMapper.readTree(response);
            System.out.println("Parsed JSON: " + result.toString());
            
            // Ensure description field exists and is not null
            if (result.get("description") == null || result.get("description").isNull() || result.get("description").asText().trim().isEmpty()) {
                System.out.println("Description field is missing or empty, adding default");
                
                // Create a new JSON with description
                String name = result.has("name") ? result.get("name").asText() : "Candidate";
                int experience = result.has("experience") ? result.get("experience").asInt() : 0;
                String skills = result.has("skills") ? result.get("skills").asText() : "";
                
                String description = experience > 0 
                    ? name + " is a professional with " + experience + " years of experience"
                    : name + " is a fresher with relevant skills";
                
                // Rebuild JSON with description
                String updatedJson = String.format(
                    "{\"name\":\"%s\",\"email\":\"%s\",\"phone\":\"%s\",\"position\":\"%s\",\"experience\":%d,\"skills\":\"%s\",\"location\":\"%s\",\"description\":\"%s\"}",
                    result.has("name") ? result.get("name").asText() : "",
                    result.has("email") ? result.get("email").asText() : "",
                    result.has("phone") ? result.get("phone").asText() : "",
                    result.has("position") ? result.get("position").asText() : "",
                    experience,
                    skills,
                    result.has("location") ? result.get("location").asText() : "",
                    description
                );
                
                result = objectMapper.readTree(updatedJson);
                System.out.println("Updated JSON with description: " + result.toString());
            }
            
            return result;

        } catch (Exception e) {
            System.err.println("Error parsing resume: " + e.getMessage());
            e.printStackTrace();
            
            // Return fallback JSON
            try {
                String fallback = "{\"name\":\"\",\"email\":\"\",\"phone\":\"\",\"position\":\"\",\"experience\":0,\"skills\":\"\",\"location\":\"\",\"description\":\"Candidate information could not be extracted\"}";
                return objectMapper.readTree(fallback);
            } catch (Exception fallbackError) {
                throw new RuntimeException("Failed to create fallback JSON: " + fallbackError.getMessage(), fallbackError);
            }
        }
    }
}