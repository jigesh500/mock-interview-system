package com.msbcgroup.mockinterview.repository;

import com.msbcgroup.mockinterview.model.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InterviewSessionRepository extends JpaRepository<InterviewSession, String> {
    InterviewSession findBySessionId(String sessionId);
    InterviewSession findByCandidateEmailAndCompleted(String candidateEmail, boolean completed);
}
