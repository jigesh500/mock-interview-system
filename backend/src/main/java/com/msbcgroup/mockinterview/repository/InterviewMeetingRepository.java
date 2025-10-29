package com.msbcgroup.mockinterview.repository;


import com.msbcgroup.mockinterview.model.InterviewMeeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewMeetingRepository extends JpaRepository<InterviewMeeting, Long> {
//    Optional<InterviewMeeting> findByMeetingId(String meetingId);
    List<InterviewMeeting> findAllByCandidateEmailAndStatus(String candidateEmail, InterviewMeeting.MeetingStatus status);
    List<InterviewMeeting> findByHrEmailAndStatus(String hrEmail, InterviewMeeting.MeetingStatus status);
    Optional<InterviewMeeting> findByLoginToken(String loginToken);
}