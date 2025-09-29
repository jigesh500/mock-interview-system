package com.msbc.MockInterviewDemo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InterviewResultRepository extends JpaRepository<InterviewResult, Long> {
    InterviewResult findByCandidateEmail(String candidateEmail);
}