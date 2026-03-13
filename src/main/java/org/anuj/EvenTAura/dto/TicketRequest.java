package org.anuj.EvenTAura.dto;


import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketRequest {
    @Min(value = 1,message = "At least buy 1 ticket")
    @NotNull
    private Integer numberOfTickets;
}
