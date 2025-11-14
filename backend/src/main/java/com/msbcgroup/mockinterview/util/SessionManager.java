package com.msbcgroup.mockinterview.util;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SessionManager {
    
    public void clearUserSession(HttpServletRequest request, HttpServletResponse response) {
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
    }
}