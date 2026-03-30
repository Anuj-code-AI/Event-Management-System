package org.anuj.EvenTAura.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.anuj.EvenTAura.model.TicketStatus;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AudienceResponse {
    private Long ticketId;
    private String name;
    private String email;
    private TicketStatus status;
    private boolean checkedIn;
    private LocalDateTime checkedInAt;
}
