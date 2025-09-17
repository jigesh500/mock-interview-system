package com.msbc.MockInterviewDemo;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SSLConfig {

    @PostConstruct
    public void init() {
        SSLUtil.disableSSL();
    }
}
