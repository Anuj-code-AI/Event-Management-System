package org.anuj.EvenTAura.controller;


import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.RegisterRequest;
import org.anuj.EvenTAura.service.AuthService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
@RequiredArgsConstructor
public class PageController {
    private final AuthService authService;
    @GetMapping("/")
    public String home(Model model){
        return "index";
    }

    @GetMapping("/login")
    public String login(Model model){
        return "login";
    }

    @GetMapping("/register")
    public String register(Model model){
        return "register";
    }

    @GetMapping("/profile")
    public String profile(Model model){
        return "profile";
    }

    @GetMapping("/createEvent")
    public String createEvent(Model model){
        return "createEvent";
    }

    @GetMapping("/oauth")
    public String oauth(Model model) {
        return "oauth";
    }

    @GetMapping("/registerForEvent/{eventId}")
    public String registerForEvent(@PathVariable Long eventId, Model model) {
        return "registerForEvent";
    }

    @GetMapping("/aboutUs")
    public String aboutUs(Model model) {
        return "aboutUs";
    }

    @GetMapping("/tickets")
    public String tickets(Model model) {
        return "tickets";
    }

    @GetMapping("/customEvent")
    public String customEvent(Model model) {
        return "customEvent";
    }

    @GetMapping("/hostedEvents")
    public String hostedEvent(Model model) {
        return "hostedEvents";
    }

    @GetMapping("/becomeOrganizer")
    public String becomeOrganizer(Model model) {
        return "becomeOrganizer";
    }

    @GetMapping("/adminPage")
    public String adminPage(Model model) {
        return "adminPage";
    }

    @GetMapping("/moments")
    public String moments(Model model) {
        return "moments";
    }

    @GetMapping("/campusEvents")
    public String campusEvents(Model model) {
        return "campusEvents";
    }

    @GetMapping("/eventDetails/{eventId}")
    public String eventDetails(@PathVariable Long eventId, Model model) {
        return "eventDetails";
    }
}
