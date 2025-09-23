package com.msbcgroup.mockinterview.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;


@Configuration
public class SecurityConfig {


    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .invalidSessionUrl("/oauth2/authorization/auth0")
                        .maximumSessions(1)
                        .maxSessionsPreventsLogin(false))
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().authenticated())
                .oauth2Login(oauth2 -> oauth2.defaultSuccessUrl("http://localhost:5173/auth/login", true))
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("https://dev-wbdogywioc218nsb.us.auth0.com/v2/logout?returnTo=http://localhost:8081&client_id=8y3QuUMxHEmLIXLvfYmM23WVE8eG4lkC")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID", "remember-me", "auth0")
                        .clearAuthentication(true));

        return http.build();
    }


}



