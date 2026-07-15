package org.anuj.EvenTAura.dto;


import lombok.AllArgsConstructor;
import org.anuj.EvenTAura.model.enums.TicketStatus;
import lombok.*;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketCheckResponse {
    private boolean isValid;
    private boolean checkedIn;
    private TicketStatus status;
    private String message;
}
