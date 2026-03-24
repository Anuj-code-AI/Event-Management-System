package org.anuj.EvenTAura.mapper;

import org.anuj.EvenTAura.dto.TicketResponse;
import org.anuj.EvenTAura.model.Ticket;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

public class TicketMapper {
    public static TicketResponse toResponse(Ticket ticket){
        String qrUrl = ServletUriComponentsBuilder
                .fromCurrentContextPath()
                .path("/api/v1/tickets/")
                .path(ticket.getTicketId().toString())
                .path("/qr")
                .toUriString();
        return new TicketResponse(
                ticket.getTicketId(),
                ticket.getTicketCode(),
                ticket.isCheckedIn(),
                ticket.getIssuedAt(),
                ticket.getCheckedInAt(),
                ticket.getStatus(),
                ticket.getEvent(),
                ticket.getUser(),
                qrUrl
        );
    }

}
