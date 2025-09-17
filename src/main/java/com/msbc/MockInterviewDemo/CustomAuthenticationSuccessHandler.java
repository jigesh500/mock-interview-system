package com.msbc.MockInterviewDemo;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Collection;


@Component
public class CustomAuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {

        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
        System.out.println(authorities);
        String redirectUrl = "/";

        for (GrantedAuthority authority : authorities) {
            if (authority.getAuthority().equals("OIDC_ADMIN")) {
                redirectUrl = "/admin/dashboard";
                break;
            } else if (authority.getAuthority().equals("OIDC_USER")) {
                redirectUrl = "/user/dashboard";
                break;
            }
        }

        response.sendRedirect(redirectUrl);
    }
}
