package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.model.CandidateProfile;
import com.msbcgroup.mockinterview.repository.CandidateProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/hr")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class HRController {

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @GetMapping("/dashboard")
    public List<CandidateProfile> hrDashboard() {
        return candidateProfileRepository.findAll();
    }

//    @GetMapping("/add-candidate")
//    public String addCandidateForm(Model model) {
//        model.addAttribute("candidate", new CandidateProfile());
//        return "add-candidate";
//    }

    @PostMapping("/candidates")
    public ResponseEntity<CandidateProfile> saveCandidate(@RequestBody CandidateProfile candidate) {
        CandidateProfile saved = candidateProfileRepository.save(candidate);
        return ResponseEntity.ok(saved);  // return the saved object as JSON
    }
//    @GetMapping("/logout")
//    public String logout() {
//        return "redirect:/logout";
//    }

}
