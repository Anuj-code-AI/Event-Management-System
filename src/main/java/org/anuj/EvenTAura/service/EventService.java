package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.EventRequest;
import org.anuj.EvenTAura.dto.EventResponse;
import org.anuj.EvenTAura.dto.EventSummaryResponse;
import org.anuj.EvenTAura.dto.EventUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;

public interface EventService {
    EventResponse createEvent(EventRequest req, Authentication auth);
    EventResponse updateEvent(Long eventId, EventUpdateRequest req, Authentication auth);
    Void deleteEvent(Long eventId, Authentication auth);
    Void cancelEvent(Long eventId, Authentication auth);

    EventResponse getEvent(Long eventId);
    Page<EventSummaryResponse> getGlobalEvents(String query, int page, int size);
    Page<EventSummaryResponse> getUniversityEvents(int page, int size, Authentication authentication);
    Page<EventSummaryResponse> getHostedEvents(int page,int size,Authentication auth);
    Page<EventSummaryResponse> getJoinedEvents(int page, int size, Authentication auth);
}
