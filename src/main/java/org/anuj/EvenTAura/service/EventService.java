package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.EventRequest;
import org.anuj.EvenTAura.dto.EventResponse;
import org.anuj.EvenTAura.dto.EventUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;

public interface EventService {
    EventResponse createEvent(EventRequest req, Authentication auth);
    EventResponse updateEvent(Long eventId, EventUpdateRequest req, Authentication auth);
    String deleteEvent(Long eventId, Authentication auth);
    EventResponse getEvent(Long eventId);
    Page<EventResponse> getAllEvents(int page,int size, String sortBy,String sortDir);
}
