package org.anuj.EvenTAura.controller;


import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.TicketCheckResponse;
import org.anuj.EvenTAura.dto.TicketRequest;
import org.anuj.EvenTAura.dto.TicketResponse;
import org.anuj.EvenTAura.model.Ticket;
import org.anuj.EvenTAura.service.TicketService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tickets/")
@RequiredArgsConstructor
public class TicketController {
    private final TicketService ticketService;

    @PostMapping("/buy/{eventId}")
    public ResponseEntity<List<Ticket>> buyTicket(@PathVariable Long eventId, @Valid @RequestBody TicketRequest req, Authentication auth) {
        return ResponseEntity.ok(ticketService.buyTicket(eventId,req,auth));
    }

    @GetMapping("/my")
    public ResponseEntity<List<Ticket>> myTicket(Authentication auth) {
        return ResponseEntity.ok(ticketService.myTicket(auth));
    }

    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<Ticket>> getTickets(@PathVariable Long eventId,Authentication auth) {
        return ResponseEntity.ok(ticketService.getTickets(eventId,auth));
    }

    @PostMapping("/checkin/{ticketCode}")
    public ResponseEntity<?> checkTicket(@PathVariable Long ticketCode,Authentication auth){
        return ResponseEntity.ok(ticketService.checkin(ticketCode,auth));
    }

    @GetMapping("/api/tickets/verify/{ticketCode}")
    public ResponseEntity<TicketCheckResponse> verifyTicket(@PathVariable Long ticketCode, Authentication auth) {
        return ResponseEntity.ok(ticketService.verifyTicket(ticketCode,auth));
    }

    @PostMapping("/{ticketId}/cancel")
    public ResponseEntity<?> deleteTicket(@PathVariable Long ticketId,Authentication auth){
        return ResponseEntity.ok(ticketService.cancelTicket(ticketId,auth));
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<TicketResponse> getMyTicket(@PathVariable Long ticketId,Authentication auth){
        return ResponseEntity.ok(ticketService.getMyTicket(ticketId));
    }
}
