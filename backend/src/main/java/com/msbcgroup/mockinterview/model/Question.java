package com.msbcgroup.mockinterview.model;


import java.util.List;

public class Question {
    private String id;
    private String type;
    private String question;
    private List<String> options;

    public Question() {
    }

    public Question(String id, String type, String question, List<String> options) {
        this.id = id;
        this.type = type;
        this.question = question;
        this.options = options;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public List<String> getOptions() {
        return options;
    }

    public void setOptions(List<String> options) {
        this.options = options;
    }
}