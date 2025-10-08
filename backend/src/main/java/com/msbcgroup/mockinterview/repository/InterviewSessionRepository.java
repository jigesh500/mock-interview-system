package com.msbcgroup.mockinterview.repository;

import com.msbcgroup.mockinterview.model.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewSessionRepository extends JpaRepository<InterviewSession, String> {
    Optional<InterviewSession> findBySessionId(String sessionId);
    Optional<InterviewSession> findByCandidateEmailAndCompleted(String candidateEmail, boolean completed);

    List<InterviewSession> findByCandidateEmail(String candidateEmail);
}
