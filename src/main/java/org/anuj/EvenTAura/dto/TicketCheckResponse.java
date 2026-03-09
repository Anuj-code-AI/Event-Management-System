package org.anuj.EvenTAura.dto;


import lombok.AllArgsConstructor;
import org.anuj.EvenTAura.model.TicketStatus;

@AllArgsConstructor
public class TicketCheckResponse {
    private boolean isValid;
    private boolean ischeckedIn;
    private TicketStatus status;
    private String message;
}
