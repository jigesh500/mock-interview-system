package com.msbcgroup.mockinterview.repository;

import com.msbcgroup.mockinterview.model.InterviewResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InterviewResultRepository extends JpaRepository<InterviewResult, Long> {
    Optional<InterviewResult> findByCandidateEmail(String candidateEmail);


}