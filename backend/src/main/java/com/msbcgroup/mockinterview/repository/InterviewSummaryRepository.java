package com.msbcgroup.mockinterview.repository;

import com.msbcgroup.mockinterview.model.InterviewSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InterviewSummaryRepository extends JpaRepository<InterviewSummary,Long> {
    Optional<InterviewSummary> findById(Long id);
}
