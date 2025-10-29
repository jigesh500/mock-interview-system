package com.msbcgroup.mockinterview.controller;


import com.msbcgroup.mockinterview.model.InterviewMeeting;
import com.msbcgroup.mockinterview.repository.InterviewMeetingRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Controller
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class AuthController {


    @Autowired
    private InterviewMeetingRepository meetingRepository;

    @Value("${spring.security.oauth2.client.registration.auth0.client-id}")
    private String clientId;

    @GetMapping("/user")
    @ResponseBody
    public Map<String, Object> getCurrentUser(@AuthenticationPrincipal OAuth2User principal) {
        Map<String, Object> response = new HashMap<>();

        if (principal != null) {
            String email = principal.getAttribute("email");
            String name = principal.getAttribute("name");

            if (email != null && name != null) {

                String role = determineUserRole(email, principal);

                Map<String, Object> user = new HashMap<>();
                user.put("id", email);
                user.put("email", email);
                user.put("name", name);
                user.put("role", role);

                response.put("user", user);
                response.put("authenticated", true);
            } else {
                response.put("authenticated", false);
            }
        }else {
            response.put("authenticated", false);
        }

        return response;
    }


    private String determineUserRole(String email, OAuth2User principal) {
        System.out.println(email);
        if (email!=null&&email.equals("jigesh.jethava@msbcgroup.com")) {
            return "hr";
        }
        return "candidate";
    }

    @PostMapping("/logout")
    @ResponseBody
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request, HttpServletResponse response) {

        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        SecurityContextHolder.clearContext();

        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                cookie.setValue("");
                cookie.setPath("/");
                cookie.setMaxAge(0);
                response.addCookie(cookie);
            }
        }
         String auth0LogoutUrl = "https://dev-wbdogywioc218nsb.us.auth0.com/v2/logout?returnTo=http://localhost:5173&client_id="+clientId;

         Map<String, String> responseBody = new HashMap<>();
         responseBody.put("message", "Logged out successfully");
         responseBody.put("auth0LogoutUrl", auth0LogoutUrl);

        return ResponseEntity.ok(responseBody);


    }


    @GetMapping("/start-interview/{token}")
    public void startInterviewWithToken(@PathVariable String token, HttpServletResponse httpResponse) throws IOException {

        // 1. Look up the meeting by the secure token
        Optional<InterviewMeeting> meetingOpt = meetingRepository.findByLoginToken(token);

        // 2. Validate the token and meeting status
        if (meetingOpt.isEmpty() ||
                meetingOpt.get().getStatus() != InterviewMeeting.MeetingStatus.SCHEDULED ||
                (meetingOpt.get().getTokenExpiry() != null && meetingOpt.get().getTokenExpiry().isBefore(LocalDateTime.now())))
        {
            // If token is not found, expired, or inactive, redirect to an error page
            httpResponse.sendRedirect("http://localhost:5173/invalid-link");
            return;
        }

//        InterviewMeeting meeting = meetingOpt.get();
//
//        // 3. SUCCESS: We found the meeting. Now we can get the candidate's email.
//        String candidateEmail = meeting.getCandidateEmail();
//        String meetingUrl = meeting.getMeetingUrl();
//
//        // 4. Invalidate the token to make it single-use (important for security)
//
//        meetingRepository.save(meeting);

        // 5. Redirect the user to a special frontend page with the candidate's details in the URL.
        // This is safe because it's a one-time redirect after successful authentication.
        String frontendRedirectUrl = String.format(
                "http://localhost:5173/candidate/portal-info/%s",
                token);
        httpResponse.sendRedirect(frontendRedirectUrl);
    }

}
