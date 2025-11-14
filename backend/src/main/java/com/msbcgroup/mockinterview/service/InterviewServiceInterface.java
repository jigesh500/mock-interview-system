package com.msbcgroup.mockinterview.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.msbcgroup.mockinterview.dto.InterviewScheduleResponse;
import com.msbcgroup.mockinterview.dto.InterviewSummaryResponse;
import java.util.Map;

public interface InterviewServiceInterface {

    InterviewScheduleResponse scheduleInterview(String candidateEmail) throws Exception;
    InterviewSummaryResponse getInterviewSummary(String candidateEmail);
    Map<String, Object> submitAnswers(Map<String, Object> requestBody) throws JsonProcessingException;
    Map<String, Object> startWithSession(String sessionId) throws JsonProcessingException;
    Map<String, Object> scheduleSecondRound(String candidateEmail);

}
