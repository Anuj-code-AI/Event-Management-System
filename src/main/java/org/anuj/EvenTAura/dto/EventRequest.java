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

    private boolean cancelable;

    private String bannerUrl;
    private String paymentQrUrl;
    private String category;
    private String club;
    private Double ticketPrice;

    @NotNull
    private ParticipationType participationType;

    @NotBlank(message = "Must select the event mode")
    private EventMode eventMode;

}
