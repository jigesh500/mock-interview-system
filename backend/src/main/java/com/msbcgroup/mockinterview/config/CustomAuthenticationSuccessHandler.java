package com.msbcgroup.mockinterview.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Set;

@Component
public class CustomAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger logger = LoggerFactory.getLogger(CustomAuthenticationSuccessHandler.class);
    

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        Set<String> roles = AuthorityUtils.authorityListToSet(authentication.getAuthorities());

        String email = authentication.getName();
        String redirectUrl = "";
        System.out.println(roles);
        if (email.equals("auth0|68c90251fc3c19e17590ed60")) {
            redirectUrl = "http://localhost:5173/hr/dashboard";
        } else if(roles.contains("OIDC_USER")){
            redirectUrl = "http://localhost:5173/interview/start";
        }

        response.sendRedirect(redirectUrl);
    }
}
