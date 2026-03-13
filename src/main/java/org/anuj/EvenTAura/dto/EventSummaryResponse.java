package org.anuj.EvenTAura.dto;

import lombok.*;

import java.time.LocalDate;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class EventSummaryResponse {
    private Long eventId;
    private String title;
    private String location;
    private LocalDate eventDate;
    private String bannerUrl;
    private String category;
    private int ticketsAvailable;
}
