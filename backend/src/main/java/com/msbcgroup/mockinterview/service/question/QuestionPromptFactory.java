package com.msbcgroup.mockinterview.service.question;

import com.msbcgroup.mockinterview.model.CandidateProfile;
import org.springframework.stereotype.Component;

@Component
public class QuestionPromptFactory {

    public String createPrompt(CandidateProfile profile) {
        return """
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
    }
}
