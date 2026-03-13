package org.anuj.EvenTAura.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import lombok.*;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketCancelResponse {
    private Long ticketId;
    private String message;

}
