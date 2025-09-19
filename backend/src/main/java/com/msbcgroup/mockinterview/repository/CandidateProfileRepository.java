package com.msbcgroup.mockinterview.repository;


import com.msbcgroup.mockinterview.model.CandidateProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CandidateProfileRepository extends JpaRepository<CandidateProfile,Long> {
    CandidateProfile findByCandidateEmail(String email);
}
