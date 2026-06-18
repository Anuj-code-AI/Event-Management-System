package org.anuj.EvenTAura.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.anuj.EvenTAura.model.enums.EventMode;
import org.anuj.EvenTAura.model.enums.EventStatus;
import org.anuj.EvenTAura.model.enums.ParticipationType;

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
    private String city;

    private LocalDate lastRegistrationDate;
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

    @ManyToOne
    private User user;

    @ManyToOne
    @JoinColumn(name = "university_id", nullable = false)
    private University university;

    @Enumerated(EnumType.STRING)
    private EventStatus eventStatus;

    @Enumerated(EnumType.STRING)
    private ParticipationType participationType;

    @Enumerated(EnumType.STRING)
    private EventMode eventMode;

    @Version
    private Long version;
}