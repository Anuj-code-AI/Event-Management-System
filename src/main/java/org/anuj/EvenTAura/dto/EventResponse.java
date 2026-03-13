package org.anuj.EvenTAura.dto;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import org.anuj.EvenTAura.model.User;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.*;
@Data
@NoArgsConstructor
@AllArgsConstructor

public class EventResponse {
    private Long eventId;
    private String title;
    private String description;
    private String location;
    private LocalDate eventDate;
    private LocalTime eventTime;
    private int totalTickets;
    private int ticketsAvailable;
    private String bannerUrl;
    private String ticketUrl;
    private String category;
    private String club;
    private User organizer;

}
