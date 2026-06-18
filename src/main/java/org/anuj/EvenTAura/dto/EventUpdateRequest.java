package org.anuj.EvenTAura.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.*;
import org.anuj.EvenTAura.model.enums.EventMode;
import org.anuj.EvenTAura.model.enums.ParticipationType;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventUpdateRequest {
    private String title;
    private String description;
    private String location;
    private String city;
    private LocalDate lastRegistrationDate;
    private LocalDate eventDate;
    private LocalTime eventTime;
    private Integer totalTickets;
    private Integer ticketsAvailable;
    private String bannerUrl;
    private String ticketUrl;
    private String paymentQrUrl;
    private Double ticketPrice;
    private String category;
    private String club;
    private ParticipationType participationType;
    private EventMode eventMode;
}
