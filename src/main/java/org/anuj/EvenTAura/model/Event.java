package org.anuj.EvenTAura.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name="event")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long eventId;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String location;

    private LocalDate eventDate;
    private LocalTime eventTime;

    private int totalTickets;
    private int ticketsAvailable;

    private String bannerUrl;
    private String ticketUrl;
    private String PaymentQrUrl;

    private Double ticketPrice;

    private String category;
    private String club;

    @ManyToOne
    private User user;

    @Enumerated(EnumType.STRING)
    private EventStatus eventStatus;

}