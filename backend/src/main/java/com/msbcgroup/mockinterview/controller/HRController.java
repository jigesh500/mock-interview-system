package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.model.CandidateProfile;
import com.msbcgroup.mockinterview.repository.CandidateProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/hr")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class HRController {

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @GetMapping("/dashboard")
    public String hrDashboard(Model model) {
        List<CandidateProfile> candidateProfiles = candidateProfileRepository.findAll();
        model.addAttribute("candidates", candidateProfiles);

        return "hr-dashboard";
    }

    @GetMapping("/add-candidate")
    public String addCandidateForm(Model model) {
        model.addAttribute("candidate", new CandidateProfile());
        return "add-candidate";
    }

    @PostMapping("/save-candidate")
    public String saveCandidate(@ModelAttribute CandidateProfile candidate) {
        candidateProfileRepository.save(candidate);
        return "redirect:/hr/dashboard";
    }

    @GetMapping("/logout")
    public String logout() {
        return "redirect:/logout";
    }

}
