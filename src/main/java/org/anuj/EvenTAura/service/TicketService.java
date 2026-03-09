package org.anuj.EvenTAura.service;

import jakarta.validation.Valid;
import org.anuj.EvenTAura.dto.TicketCancelResponse;
import org.anuj.EvenTAura.dto.TicketCheckResponse;
import org.anuj.EvenTAura.dto.TicketRequest;
import org.anuj.EvenTAura.dto.TicketResponse;
import org.anuj.EvenTAura.model.Ticket;
import org.springframework.security.core.Authentication;

import java.util.List;

public interface TicketService {
    List<Ticket> buyTicket(Long eventId, TicketRequest req, Authentication auth);

    List<Ticket> myTicket(Authentication auth);

    List<Ticket> getTickets(Long eventId, Authentication auth);

    TicketCheckResponse checkin(Long ticketId, Authentication auth);

    TicketCheckResponse verifyTicket(Long ticketCode, Authentication auth);

    TicketCancelResponse cancelTicket(Long ticketId, Authentication auth);

    TicketResponse getMyTicket(Long ticketId);
}

