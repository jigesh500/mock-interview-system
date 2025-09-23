package com.msbcgroup.mockinterview.controller;


import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class AuthController {

    @GetMapping("/user")
    public Map<String, Object> getCurrentUser(@AuthenticationPrincipal OAuth2User principal) {
        Map<String, Object> response = new HashMap<>();

        if (principal != null) {
            String email = principal.getAttribute("email");
            String name = principal.getAttribute("name");

            // Determine role based on email (same logic as your CustomAuthenticationSuccessHandler)
            String role = email.equals("auth0|68c90251fc3c19e17590ed60") ? "hr" : "candidate";

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

        return response;
    }

    @PostMapping("/logout")
    public Map<String, String> logout() {
        return Map.of("message", "Logged out successfully");
    }
}
