package org.anuj.EvenTAura.controller;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.EventRequest;
import org.anuj.EvenTAura.dto.EventResponse;
import org.anuj.EvenTAura.dto.EventSummaryResponse;
import org.anuj.EvenTAura.dto.EventUpdateRequest;
import org.anuj.EvenTAura.payload.ApiResponse;
import org.anuj.EvenTAura.service.CloudinaryService;
import org.anuj.EvenTAura.service.EventService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/event")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;
    // private final FileStorageService fileStorageService;
    private final CloudinaryService cloudinaryService;

    // Create event
    @PostMapping("/addEvent")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<EventResponse>> createEvent(
            @ModelAttribute EventRequest request,
            @RequestParam(value = "banner") MultipartFile banner,
            @RequestParam(value = "ticket") MultipartFile ticket,
            @RequestParam(value = "paymentQr", required = false) MultipartFile paymentQr,
            Authentication authentication
    ) {
        if(request.getCity() == null || request.getCity().isEmpty()){
            return ResponseEntity.badRequest().body(ApiResponse.error("City is required"));
        }

        if (banner == null || banner.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Banner image required"));
        }

        if (ticket == null || ticket.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Ticket image required"));
        }

        if (request.getTicketPrice() > 0) {
            if (paymentQr == null || paymentQr.isEmpty()) {
                return ResponseEntity.badRequest().body(ApiResponse.error("Payment QR required for paid events"));
            }
        }

        if(request.getLastRegistrationDate().isAfter(request.getEventDate())){
            return ResponseEntity.badRequest().body(ApiResponse.error("Last registration date should be before event date"));
        }

        String paymentQrUrl = null;
        if (paymentQr != null && !paymentQr.isEmpty()) {
            paymentQrUrl = cloudinaryService.uploadImage(paymentQr, "paymentQr");
        }

        String bannerUrl = cloudinaryService.uploadImage(banner, "banner");
        String ticketUrl = cloudinaryService.uploadImage(ticket, "ticket");

        request.setBannerUrl(bannerUrl);
        request.setTicketUrl(ticketUrl);
        request.setPaymentQrUrl(paymentQrUrl);

        return ResponseEntity.ok(ApiResponse.success("Event created successfully",eventService.createEvent(request, authentication)));
    }

    // Update Event
    @PatchMapping("/updateEvent/{eventId}")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<EventResponse>> updateEvent(
            @PathVariable Long eventId,
            @ModelAttribute EventUpdateRequest req,
            @RequestParam(value = "banner", required = false) MultipartFile banner,
            @RequestParam(value = "ticket", required = false) MultipartFile ticket,
            @RequestParam(value = "paymentQr", required = false) MultipartFile paymentQr,
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
        if (paymentQr != null && !paymentQr.isEmpty()) {
            //req.setTicketUrl(fileStorageService.saveImage(paymentQr, "PaymentQr"));
            req.setTicketUrl(cloudinaryService.uploadImage(paymentQr, "PaymentQr"));
        }
        return ResponseEntity.ok(ApiResponse.success("Event update successfully", eventService.updateEvent(eventId, req, auth)));
    }

    // Delete Event
    @DeleteMapping("/deleteEvent/{eventId}")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable Long eventId,Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("Event successfully deleted",eventService.deleteEvent(eventId,auth)));
    }

    // Cancel Event
    @DeleteMapping("/cancelEvent/{eventId}")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<Void>> cancelEvent(@PathVariable Long eventId,Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("Event successfully cancelled",eventService.cancelEvent(eventId,auth)));
    }

    // Uncancel Event
    @PostMapping("/uncancelEvent/{eventId}")
    @PreAuthorize("@eventSecurity.isHostOrHOD(authentication)")
    public ResponseEntity<ApiResponse<Void>> uncancelEvent(@PathVariable Long eventId, Authentication auth) {
        return ResponseEntity.ok(ApiResponse.success("Event reactivated successfully", eventService.uncancelEvent(eventId, auth)));
    }

    // Get event by id
    @GetMapping("/getEvent/{eventId}")
    public ResponseEntity<ApiResponse<EventResponse>> getEvent(@PathVariable Long eventId) {
        return ResponseEntity.ok(ApiResponse.success("Event loaded successfully", eventService.getEvent(eventId)));
    }

    // Get all global events
    @GetMapping("/global")
    public ResponseEntity<ApiResponse<Page<EventSummaryResponse>>> getGlobalEvents(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Global events loaded successfully",
                        eventService.getGlobalEvents(query, page, size)
                )
        );
    }

    // Get all university events
    @GetMapping("/getUniversityEvents")
    public ResponseEntity<ApiResponse<Page<EventSummaryResponse>>> getUniversityEvents(
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.success("University event loaded successfully", eventService.getUniversityEvents(page, size, query, authentication)));
    }

    // Get hosted events
    @GetMapping("/getHostedEvents")
    public ResponseEntity<ApiResponse<Page<EventSummaryResponse>>> getHostedEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ){
        return ResponseEntity.ok(ApiResponse.success("Events loaded successfully", eventService.getHostedEvents(page,size,auth)));
    }

    // Get joined events
    @GetMapping("/getJoinedEvents")
    public ResponseEntity<ApiResponse<Page<EventSummaryResponse>>> getJoinedEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {
        return ResponseEntity.ok(ApiResponse.success("Events loaded successfully", eventService.getJoinedEvents(page,size,auth)));
    }

}

