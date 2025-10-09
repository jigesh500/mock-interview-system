package com.msbcgroup.mockinterview.repository;


import com.msbcgroup.mockinterview.model.CandidateProfile;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CandidateProfileRepository extends JpaRepository<CandidateProfile,Long> {
    Optional<CandidateProfile> findByCandidateEmail(String email);
    Optional<CandidateProfile> findByCandidateName(String candidateName);
    @Transactional
    void deleteByCandidateName(String candidateName);
}
