package org.anuj.EvenTAura.mapper;

import org.anuj.EvenTAura.dto.EventRequest;
import org.anuj.EvenTAura.dto.EventResponse;
import org.anuj.EvenTAura.dto.EventUpdateRequest;
import org.anuj.EvenTAura.model.Event;
import org.anuj.EvenTAura.model.EventStatus;
import org.anuj.EvenTAura.model.User;

public class EventMapper {

    public static Event toEntity(EventRequest req, User user) {

        Event event = new Event();

        event.setTitle(req.getTitle());
        event.setDescription(req.getDescription());
        event.setLocation(req.getLocation());
        event.setEventDate(req.getEventDate());
        event.setEventTime(req.getEventTime());
        event.setClub(req.getClub());
        event.setTotalTickets(req.getTotalTickets());
        event.setTicketsAvailable(req.getTicketsAvailable());
        event.setBannerUrl(req.getBannerUrl());
        event.setTicketUrl(req.getTicketUrl());
        event.setPaymentQrUrl(req.getPaymentQrUrl());
        event.setTicketPrice(req.getTicketPrice());
        event.setCategory(req.getCategory());
        event.setUser(user);
        event.setEventStatus(EventStatus.PENDING);
        return event;
    }

    public static EventResponse toResponse(Event event) {

        return new EventResponse(
                event.getEventId(),
                event.getTitle(),
                event.getDescription(),
                event.getLocation(),
                event.getEventDate(),
                event.getEventTime(),
                event.getTotalTickets(),
                event.getTicketsAvailable(),
                event.getBannerUrl(),
                event.getTicketUrl(),
                event.getPaymentQrUrl(),
                event.getTicketPrice(),
                event.getCategory(),
                event.getClub(),
                event.getUser()
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
        if(req.getEventDate() != null){
            event.setEventDate(req.getEventDate());
        }
        if(req.getEventTime() != null){
            event.setEventTime(req.getEventTime());
        }
        if(req.getClub() != null){
            event.setClub(req.getClub());
        }
        if(req.getTotalTickets() != null){
            event.setTotalTickets(req.getTotalTickets());
        }
        if(req.getTicketsAvailable() != null){
            event.setTicketsAvailable(req.getTicketsAvailable());
        }
        if(req.getBannerUrl() != null){
            event.setBannerUrl(req.getBannerUrl());
        }
        if(req.getTicketUrl() != null){
            event.setTicketUrl(req.getTicketUrl());
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
    }
}