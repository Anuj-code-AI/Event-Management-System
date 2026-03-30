package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.EventRequest;
import org.anuj.EvenTAura.dto.EventResponse;
import org.anuj.EvenTAura.dto.EventSummaryResponse;
import org.anuj.EvenTAura.dto.EventUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;

import java.util.List;

public interface EventService {
    EventResponse createEvent(EventRequest req, Authentication auth);
    EventResponse updateEvent(Long eventId, EventUpdateRequest req, Authentication auth);
    String deleteEvent(Long eventId, Authentication auth);
    EventResponse getEvent(Long eventId);

    Page<EventSummaryResponse> getAllEvents(int page, int size);

    Page<EventResponse> getHostedEvents(int page,int size,Authentication auth);

    Page<EventResponse> getJoinedEvents(int page, int size, Authentication auth);

    Page<EventResponse> getHostedEventsForAdmin(int page, int size, Authentication auth);

    Page<EventSummaryResponse> getAllApprovedEvents(int page, int size);
}
