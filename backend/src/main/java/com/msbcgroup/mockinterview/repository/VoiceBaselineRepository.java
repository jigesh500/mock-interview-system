package com.msbcgroup.mockinterview.repository;

import com.msbcgroup.mockinterview.model.VoiceBaseline;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VoiceBaselineRepository extends JpaRepository<VoiceBaseline, Long> {
    Optional<VoiceBaseline> findByCandidateEmail(String candidateEmail);
    Optional<VoiceBaseline> findBySessionId(String sessionId);
    
    @Transactional
    void deleteByCandidateEmail(String candidateEmail);
}