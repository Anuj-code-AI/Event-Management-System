package org.anuj.EvenTAura.dto;

import lombok.*;
import org.anuj.EvenTAura.model.enums.EventStatus;

import java.time.LocalDate;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class EventSummaryResponse {
    private Long eventId;
    private String title;
    private String location;
    private LocalDate lastRegistrationDate;
    private String bannerUrl;
    private String category;
    private Double ticketPrice;
    private EventStatus eventStatus;
    private String logoUrl;
}
