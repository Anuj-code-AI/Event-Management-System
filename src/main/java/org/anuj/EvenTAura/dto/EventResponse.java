package org.anuj.EvenTAura.dto;

import lombok.AllArgsConstructor;
import org.anuj.EvenTAura.model.University;
import org.anuj.EvenTAura.model.User;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.*;
import org.anuj.EvenTAura.model.enums.EventMode;
import org.anuj.EvenTAura.model.enums.EventStatus;
import org.anuj.EvenTAura.model.enums.ParticipationType;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventResponse {
    private Long eventId;
    private String title;
    private String description;
    private String location;
    private String city;
    private LocalDate lastRegisterDate;
    private LocalDate eventDate;
    private LocalTime eventTime;
    private int totalTickets;
    private int ticketsAvailable;
    private String bannerUrl;
    private String ticketUrl;
    private String paymentQrUrl;
    private Double ticketPrice;
    private String category;
    private String club;
    private User organizer;
    private University university;
    private EventStatus eventStatus;
    private ParticipationType participationType;
    private EventMode eventMode;
}
