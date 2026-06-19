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




    @GetMapping("/globalEvents")
    public String globalEvents(){
        return "globalEvents";
    }

    @GetMapping("/campusEvents")
    public String campusEvents(){
        return "campusEvents";
    }

    @GetMapping("/indexTemp")
    public String indexTemp(){
        return "indexTemp";
    }

    @GetMapping("/index")
    public String index(){
        return "index";
    }

    @GetMapping("/profile")
    public String profile(){
        return "profile";
    }

    @GetMapping("/createEvent")
    public String createEvent(){
        return "createEvent";
    }

    @GetMapping("/oauth")
    public String oauth() {
        return "oauth";
    }

    @GetMapping("/registerForEvent/{eventId}")
    public String registerForEvent() {
        return "registerForEvent";
    }

    @GetMapping("/aboutUs")
    public String aboutUs() {
        return "aboutUs";
    }

    @GetMapping("/tickets")
    public String tickets() {
        return "tickets";
    }

    @GetMapping("/customEvent")
    public String customEvent() {
        return "customEvent";
    }

    @GetMapping("/hostedEvents")
    public String hostedEvent() {
        return "hostedEvents";
    }

    @GetMapping("/becomeOrganizer")
    public String becomeOrganizer() {
        return "becomeOrganizer";
    }

    @GetMapping("/adminPage")
    public String adminPage() {
        return "adminPage";
    }

    @GetMapping("/moments")
    public String moments() {
        return "moments";
    }

    @GetMapping("/eventDetails/{eventId}")
    public String eventDetails() {
        return "eventDetails";
    }
}
