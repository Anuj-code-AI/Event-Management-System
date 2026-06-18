package org.anuj.EvenTAura.controller;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.*;
import org.anuj.EvenTAura.model.Ticket;
import org.anuj.EvenTAura.payload.ApiResponse;
import org.anuj.EvenTAura.repository.TicketRepository;
import org.anuj.EvenTAura.service.TicketService;
import org.anuj.EvenTAura.util.QRCodeGenerator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tickets")
@RequiredArgsConstructor
public class TicketController {

    @Value("${app.base-url}")
    private String baseUrl;
    private final TicketService ticketService;
    private final TicketRepository ticketRepository;

    // buy ticket
    @PostMapping("/buy/{eventId}")
    public ResponseEntity<ApiResponse<TicketResponse>> buyTicket(
            @PathVariable Long eventId,
            @RequestParam(value = "paymentScreenShot", required = false) MultipartFile file,
            Authentication auth
    ) {
        return ResponseEntity.ok(
                ApiResponse.success("Ticket bought successfully", ticketService.buyTicket(eventId, file, auth))
        );
    }

    // Load my-tickets
    @GetMapping("/myTickets")
    public ResponseEntity<ApiResponse<Page<TicketResponse>>> myTickets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication auth
    ) {
        return ResponseEntity.ok(
                ApiResponse.success("Tickets loaded successfully", ticketService.myTickets(page,size,auth))
        );
    }

    // Get all tickets of particular event
    @GetMapping("/event/{eventId}")
    public ResponseEntity<ApiResponse<List<Ticket>>> getTickets(@PathVariable Long eventId,Authentication auth) {
        return ResponseEntity.ok(
                ApiResponse.success("Tickets loaded successfully", ticketService.getTickets(eventId,auth))
        );
    }

    // Check ticke and mark present
    @PostMapping("/checkin/{ticketCode}")
    public ResponseEntity<ApiResponse<TicketCheckResponse>> checkTicket(@PathVariable Long ticketCode,Authentication auth){
        return ResponseEntity.ok(ApiResponse.success("Present marked", ticketService.checkin(ticketCode,auth)));
    }

    // Only verifies the ticket validity
    @GetMapping("/api/tickets/verify/{ticketCode}")
    public ResponseEntity<TicketCheckResponse> verifyTicket(@PathVariable Long ticketCode, Authentication auth) {
        return ResponseEntity.ok(ticketService.verifyTicket(ticketCode,auth));
    }

    // Cancel ticket
    @PostMapping("/{ticketId}/cancel")
    public ResponseEntity<ApiResponse<TicketCancelResponse>> cancelTicket(@PathVariable Long ticketId, Authentication auth){
        return ResponseEntity.ok(
                ApiResponse.success("Ticket canceled successfully", ticketService.cancelTicket(ticketId,auth))
        );
    }

    // Get my ticket by id
    @GetMapping("/{ticketId}")
    public ResponseEntity<ApiResponse<TicketResponse>> getMyTicket(@PathVariable Long ticketId,Authentication auth){
        return ResponseEntity.ok(
                ApiResponse.success("Ticket founded successfully", ticketService.getMyTicket(ticketId, auth))
        );
    }

    @GetMapping("/{id}/qr")
    public ResponseEntity<byte[]> getQR(@PathVariable Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow();

        byte[] qrImage = QRCodeGenerator.generateQRCodeImage(
                baseUrl + "/" + ticket.getTicketCode()
        );
        return ResponseEntity.ok()
                .header("Content-Type", "image/png")
                .body(qrImage);
    }

    @GetMapping("/audienceList/{eventId}")
    public ResponseEntity<ApiResponse<Page<AudienceResponse>>> audienceList(
            @PathVariable Long eventId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication
    ){
        return ResponseEntity.ok(
                ApiResponse.success("List generated successfully", ticketService.audienceList(page,size,eventId,authentication))
        );
    }

    @PostMapping("/{ticketId}/markPresent")
    public ResponseEntity<Void> markPresent(@PathVariable Long ticketId,Authentication authentication){
        ticketService.markPresent(ticketId,authentication);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{ticketId}/markAbsent")
    public ResponseEntity<Void> markAbsent(@PathVariable Long ticketId,Authentication authentication){
        ticketService.markAbsent(ticketId,authentication);
        return ResponseEntity.noContent().build();
    }


}
