package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.*;
import org.anuj.EvenTAura.model.Ticket;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface TicketService {
    List<TicketResponse> buyTicket(Long eventId, MultipartFile file, TicketRequest req, Authentication auth);

    Page<TicketResponse> myTicket(int page, int size, Authentication auth);

    List<Ticket> getTickets(Long eventId, Authentication auth);

    TicketCheckResponse checkin(Long ticketId, Authentication auth);

    TicketCheckResponse verifyTicket(Long ticketCode, Authentication auth);

    TicketCancelResponse cancelTicket(Long ticketId, Authentication auth);

    TicketResponse getMyTicket(Long ticketId);

    Page<AudienceResponse> audienceList(int page,int size, Long eventId, Authentication authentication);

    void markPresent(Long ticketId, Authentication authentication);

    void markAbsent(Long ticketId, Authentication authentication);
}

