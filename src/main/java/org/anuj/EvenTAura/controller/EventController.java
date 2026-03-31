package org.anuj.EvenTAura.controller;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.EventRequest;
import org.anuj.EvenTAura.dto.EventResponse;
import org.anuj.EvenTAura.dto.EventSummaryResponse;
import org.anuj.EvenTAura.dto.EventUpdateRequest;
import org.anuj.EvenTAura.service.CloudinaryService;
import org.anuj.EvenTAura.service.EventService;
import org.anuj.EvenTAura.service.FileStorageService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/event")
@RequiredArgsConstructor
public class EventController {
    private final EventService eventService;
    //private final FileStorageService fileStorageService;
    private final CloudinaryService cloudinaryService;
    @PostMapping("/addEvent")
    public ResponseEntity<?> createEvent(
            @ModelAttribute EventRequest request,
            @RequestParam("banner") MultipartFile banner,
            @RequestParam("ticket") MultipartFile ticket,
            Authentication authentication
    ) {

        if (banner == null || banner.isEmpty()) {
            return ResponseEntity.badRequest().body("Banner image required");
        }

        if (ticket == null || ticket.isEmpty()) {
            return ResponseEntity.badRequest().body("Ticket image required");
        }


        //String bannerUrl = fileStorageService.saveImage(banner,"Banner");
        String bannerUrl = cloudinaryService.uploadImage(banner, "Banner");

        //String ticketUrl = fileStorageService.saveImage(ticket,"Ticket");
        String ticketUrl = cloudinaryService.uploadImage(ticket, "Banner");


        request.setBannerUrl(bannerUrl);
        request.setTicketUrl(ticketUrl);



        return ResponseEntity.ok(eventService.createEvent(request,authentication));
    }

    @GetMapping("/getEvent/{eventId}")
    public ResponseEntity<EventResponse> getEvent(@PathVariable Long eventId) {
        return ResponseEntity.ok(eventService.getEvent(eventId));
    }

    @DeleteMapping("/deleteEvent/{eventId}")
    public ResponseEntity<?> deleteEvent(@PathVariable Long eventId,Authentication auth) {
        return ResponseEntity.ok(eventService.deleteEvent(eventId,auth));
    }

    @PatchMapping("/updateEvent/{eventId}")
    public ResponseEntity<?> updateEvent(
            @PathVariable Long eventId,
            @ModelAttribute EventUpdateRequest req,
            @RequestParam(value = "banner", required = false) MultipartFile banner,
            @RequestParam(value = "ticket", required = false) MultipartFile ticket,
            Authentication auth
    ) {
        if (banner != null && !banner.isEmpty()) {
            //req.setBannerUrl(fileStorageService.saveImage(banner, "Banner"));
            req.setBannerUrl(cloudinaryService.uploadImage(banner, "Banner"));
        }
        if (ticket != null && !ticket.isEmpty()) {
            //req.setTicketUrl(fileStorageService.saveImage(ticket, "Ticket"));
            req.setTicketUrl(cloudinaryService.uploadImage(ticket, "Ticket"));
        }
        return ResponseEntity.ok(eventService.updateEvent(eventId, req, auth));
    }


    @GetMapping("/getAllEvents")
    public ResponseEntity<Page<EventSummaryResponse>> getAllEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(eventService.getAllEvents(page, size));
    }

    @GetMapping("/getAllApprovedEvents")
    public ResponseEntity<Page<EventSummaryResponse>> getAllApprovedEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(eventService.getAllApprovedEvents(page, size));
    }

    //Event hosted
    @GetMapping("/getHostedEvents")
    public ResponseEntity<Page<EventResponse>> getHostedEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth){
        return ResponseEntity.ok(eventService.getHostedEvents(page,size,auth));
    }

    //Event joined
    @GetMapping("/getJoinedEvents")
    public ResponseEntity<Page<EventResponse>> getJoinedEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth){
        return ResponseEntity.ok(eventService.getJoinedEvents(page,size,auth));
    }

    @GetMapping("/getHostedEventsForAdmin")
    public ResponseEntity<Page<EventResponse>> getHostedEventsForAdmin(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth){
        return ResponseEntity.ok(eventService.getHostedEventsForAdmin(page,size,auth));
    }

}

