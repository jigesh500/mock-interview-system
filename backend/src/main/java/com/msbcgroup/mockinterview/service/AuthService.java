package com.msbcgroup.mockinterview.service;

import com.msbcgroup.mockinterview.model.InterviewMeeting;
import com.msbcgroup.mockinterview.repository.InterviewMeetingRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private InterviewMeetingRepository meetingRepository;

    public String determineUserRole(String email) {
        if (email != null && email.equals("jigesh.jethava@msbcgroup.com")) {
            return "hr";
        }
        return "candidate";
    }

    public boolean isValidInterviewToken(String token) {
        Optional<InterviewMeeting> meetingOpt = meetingRepository.findByLoginToken(token);
        
        return meetingOpt.isPresent() &&
               meetingOpt.get().getStatus() == InterviewMeeting.MeetingStatus.SCHEDULED &&
               (meetingOpt.get().getTokenExpiry() == null || 
                meetingOpt.get().getTokenExpiry().isAfter(LocalDateTime.now()));
    }
    
    public String extractEmailFromPrincipal(OAuth2User principal) {
        return principal != null ? principal.getAttribute("email") : "unknown@example.com";
    }
    
    public Map<String, String> logout() {
        ServletRequestAttributes attr = (ServletRequestAttributes) RequestContextHolder.currentRequestAttributes();
        HttpServletRequest request = attr.getRequest();
        HttpServletResponse response = attr.getResponse();
        
        // Invalidate the session
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        // Clear the security context
        SecurityContextHolder.clearContext();

        // Remove cookies
        Cookie[] cookies = request.getCookies();
        if (cookies != null && response != null) {
            for (Cookie cookie : cookies) {
                cookie.setValue("");
                cookie.setPath("/");
                cookie.setMaxAge(0);
                response.addCookie(cookie);
            }
        }

        Map<String, String> responseBody = new HashMap<>();
        responseBody.put("message", "Logged out successfully");
        return responseBody;
    }
}