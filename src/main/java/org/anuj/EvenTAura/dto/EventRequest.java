package org.anuj.EvenTAura.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.time.LocalTime;

import lombok.*;
import org.anuj.EvenTAura.model.enums.EventMode;
import org.anuj.EvenTAura.model.enums.ParticipationType;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventRequest {

    @NotBlank(message = "Event title required*")
    private String title;

    private String description;

    @NotBlank(message = "Location of event must be filled")
    private String location;

    @NotBlank(message = "City of event or choose Online Mode")
    private String city;

    @NotNull(message = "Last registration date should not be blank")
    @Future(message = "Event date must be in future")
    private LocalDate lastRegistrationDate;

    @Future(message = "Event date must be in future")
    private LocalDate eventDate;

    @NotNull(message = "Event time can't be null")
    private LocalTime eventTime;

    @Min(value = 1, message = "Minimum tickets must be 1")
    private Integer totalTickets;

    @Min(value = 0, message = "Minimum available tickets must be 0")
    private Integer ticketsAvailable;

    private String bannerUrl;
    private String ticketUrl;
    private String paymentQrUrl;
    private String category;
    private String club;
    private Double ticketPrice;

    @NotBlank(message = "Must decide the participation type of event")
    private ParticipationType participationType;

    @NotBlank(message = "Must select the event mode")
    private EventMode eventMode;

}
