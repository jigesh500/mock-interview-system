package com.msbcgroup.mockinterview.service;

import com.msbcgroup.mockinterview.model.CandidateProfile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class OutlookSMTPService {

    private static final Logger logger = LoggerFactory.getLogger(OutlookSMTPService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${hr.email}")
    private String hrEmail;

    public void sendSecondRoundScheduleEmail(CandidateProfile candidate, String interviewerEmail, 
                                           String interviewerName, LocalDateTime scheduledDateTime) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(hrEmail);
            helper.setTo(interviewerEmail);
            helper.setSubject("PI Interview Assignment - " + candidate.getCandidateName());
            helper.setText(buildEmailContent(candidate, scheduledDateTime), true);
            
            mailSender.send(message);
            logger.info("PI interview email sent successfully to: {}", interviewerEmail);
            
        } catch (Exception e) {
            logger.error("Failed to send PI interview email to: {}", interviewerEmail, e);
            throw new RuntimeException("Failed to send PI interview scheduling email", e);
        }
    }

    private String buildEmailContent(CandidateProfile candidate, LocalDateTime scheduledDateTime) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMMM dd, yyyy 'at' hh:mm a");
        String formattedDateTime = scheduledDateTime != null ? scheduledDateTime.format(formatter) : "TBD";
        
        return String.format("""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h2 style="color: #2c3e50; margin-top: 0;">PI Interview Assignment</h2>
                    </div>
                    
                    <p>Dear Interviewer,</p>
                    
                    <p>You have been assigned to conduct a <strong>Personal Interview (PI)</strong> for the following candidate:</p>
                    
                    <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #2c3e50;">Candidate Details:</h3>
                        <ul style="list-style-type: none; padding: 0;">
                            <li><strong>Name:</strong> %s</li>
                            <li><strong>Email:</strong> %s</li>
                            <li><strong>Position Applied:</strong> %s</li>
                            <li><strong>Experience:</strong> %d years</li>
                            <li><strong>Skills:</strong> %s</li>
                            <li><strong>Location:</strong> %s</li>
                        </ul>
                    </div>
                    
                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #856404;">Interview Schedule:</h3>
                        <p><strong>Scheduled Date & Time:</strong> %s</p>
                        <p><strong>Interview Type:</strong> Personal Interview (PI)</p>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #2c3e50;">PI Interview Focus Areas:</h3>
                        <ul>
                            <li>Communication skills and personality assessment</li>
                            <li>Cultural fit and team compatibility</li>
                            <li>Career goals and motivation</li>
                            <li>Leadership potential and problem-solving approach</li>
                            <li>Behavioral questions and situational scenarios</li>
                        </ul>
                    </div>
                    
                    <p><strong>Note:</strong> This candidate has successfully cleared the technical assessment and is now ready for the final Personal Interview round.</p>
                    
                    <p>Please confirm your availability and reach out if you have any questions.</p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="color: #666; font-size: 14px;">
                            Best regards,<br>
                            HR Team<br>
                            Mock Interview System
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """,
            candidate.getCandidateName(),
            candidate.getCandidateEmail(),
            candidate.getPositionApplied(),
            candidate.getExperienceYears(),
            candidate.getSkills(),
            candidate.getLocation(),
            formattedDateTime
        );
    }
}