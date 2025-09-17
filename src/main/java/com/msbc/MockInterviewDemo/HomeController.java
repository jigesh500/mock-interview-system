package com.msbc.MockInterviewDemo;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {
    
    @GetMapping("/")
    public String home() {
        return "home";
    }
    
    @GetMapping("/home")
    public String homePage() {
        return "home";
    }
    
    @GetMapping("/chat")
    public String chatPage() {
        return "chat";
    }
}
