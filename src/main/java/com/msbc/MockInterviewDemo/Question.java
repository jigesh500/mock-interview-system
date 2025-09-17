package com.msbc.MockInterviewDemo;

public class Question {
    private String type;
    private String question;
    private String[] options;
    
    public Question(String type, String question, String[] options) {
        this.type = type;
        this.question = question;
        this.options = options;
    }
    
    public String getType() { return type; }
    public String getQuestion() { return question; }
    public String[] getOptions() { return options; }
    public boolean hasOptions() { return options != null && options.length > 0; }
}