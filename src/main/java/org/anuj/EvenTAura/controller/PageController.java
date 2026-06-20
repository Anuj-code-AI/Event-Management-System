package org.anuj.EvenTAura.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@RequiredArgsConstructor
public class PageController {

    @GetMapping("/")
    public String landingPage(){
        return "landingPage";
    }

    @GetMapping("/aboutUs")
    public String aboutUs() {
        return "aboutUs";
    }

    @GetMapping("/contact")
    public String contact() {
        return "contact";
    }

    @GetMapping("/login")
    public String login(){
        return "login";
    }

    @GetMapping("/register")
    public String register(){
        return "register";
    }

    @GetMapping("/home")
    public String home(){
        return "home";
    }

    @GetMapping("/universities")
    public String universities() {
        return "universities";
    }

    @GetMapping({"/campus-events","/campus-events/**"})
    public String campusEvents(){
        return "campus-events";
    }

    @GetMapping("/event-management")
    public String eventManagement() {
        return "event-management";
    }

    @GetMapping("/request-event")
    public String requestEvent(){
        return "request-event";
    }

    @GetMapping("/oauth")
    public String oauth() {
        return "oauth";
    }

    @GetMapping("/admin")
    public String admin() {
        return "admin";
    }

    @GetMapping({"/eventDetails", "/eventDetails/{eventId}"})
    public String eventDetails() {
        return "eventDetails";
    }

    @GetMapping({"/tickets", "/my-tickets"})
    public String tickets() {
        return "tickets";
    }

    @GetMapping("/myEvents")
    public String myEvents() {
        return "myEvents";
    }

    @GetMapping("/profile")
    public String profile() {
        return "profile";
    }

}
