package org.anuj.EvenTAura.dto;

import lombok.Getter;
import lombok.Setter;
import org.anuj.EvenTAura.model.User;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.*;
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventUpdateRequest {
    private String title;
    private String description;
    private String location;
    private LocalDate eventDate;
    private LocalTime eventTime;
    private Integer totalTickets;
    private Integer ticketsAvailable;
    private String club;
    private String bannerUrl;
    private String ticketUrl;
    private String paymentQrUrl;
    private Double ticketPrice;
    private String category;
    private User organizer;
}
