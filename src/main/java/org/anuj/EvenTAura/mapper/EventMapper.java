package org.anuj.EvenTAura.mapper;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.EventRequest;
import org.anuj.EvenTAura.dto.EventResponse;
import org.anuj.EvenTAura.dto.EventUpdateRequest;
import org.anuj.EvenTAura.model.Event;
import org.anuj.EvenTAura.model.enums.EventStatus;
import org.anuj.EvenTAura.model.User;

import java.util.UUID;

@RequiredArgsConstructor
public class EventMapper {

    public static Event toEntity(EventRequest req, User user) {

        Event event = new Event();
        event.setTitle(req.getTitle());
        event.setDescription(req.getDescription());
        event.setLocation(req.getLocation());
        event.setCity(req.getCity());
        event.setLastRegistrationDate(req.getLastRegistrationDate());
        event.setEventDate(req.getEventDate());
        event.setEventTime(req.getEventTime());
        event.setTotalTickets(req.getTotalTickets());
        event.setCancelable(req.isCancelable());
        event.setBannerUrl(req.getBannerUrl());
        event.setPaymentQrUrl(req.getPaymentQrUrl());
        event.setCategory(req.getCategory());
        event.setClub(req.getClub());
        event.setTicketPrice(req.getTicketPrice());
        event.setUser(user);
        event.setUniversity(user.getUniversity());
        event.setEventStatus(EventStatus.PENDING);
        event.setParticipationType(req.getParticipationType());
        event.setEventMode(req.getEventMode());
        event.setTicketsAvailable(req.getTotalTickets());
        return event;
    }

    public static EventResponse toResponse(Event event) {

        return new EventResponse(
                event.getUniqueId(),                    // in mapper the eventId is being mapped by uniqueId
                event.getTitle(),
                event.getDescription(),
                event.getLocation(),
                event.getCity(),
                event.getLastRegistrationDate(),
                event.getEventDate(),
                event.getEventTime(),
                event.getTotalTickets(),
                event.getTicketsAvailable(),
                event.isCancelable(),
                event.getBannerUrl(),
                event.getPaymentQrUrl(),
                event.getTicketPrice(),
                event.getCategory(),
                event.getClub(),
                event.getUser(),
                event.getUniversity(),
                event.getEventStatus(),
                event.getParticipationType(),
                event.getEventMode()
        );
    }

    public static void updateEventFromRequest(EventUpdateRequest req, Event event) {
        if(req.getTitle() != null){
            event.setTitle(req.getTitle());
        }
        if(req.getDescription() != null){
            event.setDescription(req.getDescription());
        }
        if(req.getLocation() != null){
            event.setLocation(req.getLocation());
        }
        if(req.getCity() != null){
            event.setCity(req.getCity());
        }
        if(req.getLastRegistrationDate() != null){
            event.setLastRegistrationDate(req.getLastRegistrationDate());
        }
        if(req.getEventDate() != null){
            event.setEventDate(req.getEventDate());
        }
        if(req.getEventTime() != null){
            event.setEventTime(req.getEventTime());
        }
        if(req.getCancelable() != null){
            event.setCancelable(req.getCancelable());
        }
        if(req.getBannerUrl() != null){
            event.setBannerUrl(req.getBannerUrl());
        }
        if(req.getPaymentQrUrl() != null){
            event.setPaymentQrUrl(req.getPaymentQrUrl());
        }
        if(req.getTicketPrice() != null){
            event.setTicketPrice(req.getTicketPrice());
        }
        if(req.getCategory() != null){
            event.setCategory(req.getCategory());
        }
        if(req.getClub() != null){
            event.setClub(req.getClub());
        }
        if(req.getParticipationType() != null){
            event.setParticipationType(req.getParticipationType());
        }
        if(req.getEventMode() != null){
            event.setEventMode(req.getEventMode());
        }
    }

}