package org.anuj.EvenTAura.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.io.File;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter @Setter
public class EventRequest {

    @NotBlank(message = "Event title required*")
    private String title;

    private String description;

    @NotBlank(message = "Location of event must be filled")
    private String location;

    @Future(message = "Event date must be in future")
    private LocalDate eventDate;

    @NotNull(message = "Event time can't be null")
    private LocalTime eventTime;

    @Min(value = 1, message = "Minimum tickets must be 1")
    private Integer totalTickets;

    @Min(value = 0, message = "Minimum available tickets must be 0")
    private Integer ticketsAvailable;

    private String club;
    private String bannerUrl;
    private String ticketUrl;
    private String category;

}
