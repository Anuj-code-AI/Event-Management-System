package org.anuj.EvenTAura.dto;

import lombok.AllArgsConstructor;
import org.anuj.EvenTAura.model.Event;
import org.anuj.EvenTAura.model.TicketStatus;
import org.anuj.EvenTAura.model.User;

import java.time.LocalDateTime;

import lombok.*;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketResponse {
    private Long ticketId;
    private String ticketCode;   // unique number / QR code
    private boolean checkedIn;
    private LocalDateTime issuedAt;
    private LocalDateTime checkedInAt;
    private TicketStatus status;
    private Event event;
    private User user;
    private String qrUrl;
}
