package org.anuj.EvenTAura.service;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.EventRequest;
import org.anuj.EvenTAura.dto.EventResponse;
import org.anuj.EvenTAura.dto.EventUpdateRequest;
import org.anuj.EvenTAura.exception.EventNotExistException;
import org.anuj.EvenTAura.exception.UnauthorizedException;
import org.anuj.EvenTAura.exception.UserNotFoundException;
import org.anuj.EvenTAura.mapper.EventMapper;
import org.anuj.EvenTAura.model.Event;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.repository.EventRepository;
import org.anuj.EvenTAura.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EventServiceImpl implements EventService{
    private final UserRepository userRepository;
    private final EventRepository eventRepository;

    @Override
    public EventResponse createEvent(EventRequest req, Authentication auth) {

        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (req.getTicketsAvailable() > req.getTotalTickets()) {
            throw new IllegalArgumentException("Tickets available cannot exceed total tickets");
        }
        Event event = EventMapper.toEntity(req, user);

        Event savedEvent = eventRepository.save(event);

        return EventMapper.toResponse(savedEvent);
    }

    @Override
    public EventResponse updateEvent(Long eventId, EventUpdateRequest req, Authentication auth) {

        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventNotExistException("No event found with this id"));

        if(!user.getUserId().equals(event.getUser().getUserId())){
            throw new UnauthorizedException("You cannot update this event");
        }

        EventMapper.updateEventFromRequest(req, event);

        Event savedEvent = eventRepository.save(event);

        return EventMapper.toResponse(savedEvent);
    }

    @Override
    public String deleteEvent(Long eventId,Authentication auth) {
        String email = auth.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        Event event = eventRepository.findById(eventId)
                .orElseThrow(()-> new EventNotExistException("No event found with this id"));
        if(!user.getUserId().equals(event.getUser().getUserId())){
            throw new UnauthorizedException("You cannot delete this event");
        }
        eventRepository.delete(event);
        return "Event successfully deleted";

    }

    @Override
    public EventResponse getEvent(Long eventId) {
        return EventMapper.toResponse(eventRepository.findById(eventId)
                .orElseThrow(()->new EventNotExistException("Event Not Found")));
    }

    @Override
    public Page<EventResponse> getAllEvents(int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        PageRequest pageRequest = PageRequest.of(page, size, sort);

        Page<Event> eventPage = eventRepository.findAll(pageRequest);

        return eventPage.map(event ->
                new EventResponse(
                        event.getEventId(),
                        event.getTitle(),
                        event.getDescription(),
                        event.getLocation(),
                        event.getEventDate(),
                        event.getEventTime(),
                        event.getTotalTickets(),
                        event.getTicketsAvailable(),
                        event.getBannerUrl(),
                        event.getClub(),
                        event.getUser()
                )
        );
    }
}
