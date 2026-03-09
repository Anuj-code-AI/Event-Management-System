package org.anuj.EvenTAura.dto;


import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class TicketRequest {
    @Min(value = 1,message = "At least buy 1 ticket")
    private Integer quantity;
}
