package org.anuj.EvenTAura.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
@RequiredArgsConstructor
public class PageController {

    @GetMapping("/")
    public String landingPage(){
        return "landing-page";
    }

    @GetMapping("/about-us")
    public String aboutUs() {
        return "about-us";
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

    @GetMapping("/verify-email")
    public String verifyEmail(){
        return "verify-email";
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

    @GetMapping("/create-custom-form")
    public String createCustomForm(){
        return "create-custom-form";
    }

    @GetMapping("/update-custom-form")
    public String updateCustomForm(){
        return "update-custom-form";
    }



    @GetMapping("/oauth")
    public String oauth() {
        return "oauth";
    }

    @GetMapping("/admin")
    public String admin() {
        return "admin";
    }

    @GetMapping({"/event-details", "/eventDetails", "/event-details/{eventId}", "/eventDetails/{eventId}"})
    public String eventDetails() {
        return "event-details";
    }

    @GetMapping({"/form-details", "/formDetails", "/form-details/{formId}", "/formDetails/{formId}", "/form-details/{formId}/preview", "/formDetails/{formId}/preview"})
    public String formDetails() {
        return "form-details";
    }

    @GetMapping({"/tickets", "/my-tickets"})
    public String tickets() {
        return "tickets";
    }

    @GetMapping("/my-events")
    public String myEvents() {
        return "my-events";
    }

    @GetMapping("/profile")
    public String profile() {
        return "profile";
    }

    // HOD dynamic action redirects
    @GetMapping("/update-event/{eventId}")
    public String updateEventRedirect(@PathVariable String eventId) {
        return "redirect:/request-event?id=" + eventId;
    }

    @GetMapping("/event-management/{eventId}")
    public String eventManagementRedirect(@PathVariable String eventId) {
        return "redirect:/event-management?manageAttendance=" + eventId;
    }

    @GetMapping("/update-custom-form/{formId}")
    public String updateCustomFormRedirect(@PathVariable String formId) {
        return "redirect:/update-custom-form?formId=" + formId;
    }

    @GetMapping("/form-responses/{formId}")
    public String formResponses() {
        return "form-responses";
    }
}
