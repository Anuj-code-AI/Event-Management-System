package org.anuj.EvenTAura.service;

import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.EventRequest;
import org.anuj.EvenTAura.dto.EventResponse;
import org.anuj.EvenTAura.dto.EventSummaryResponse;
import org.anuj.EvenTAura.dto.EventUpdateRequest;
import org.anuj.EvenTAura.exception.EventNotExistException;
import org.anuj.EvenTAura.exception.NoEventFoundException;
import org.anuj.EvenTAura.exception.UnauthorizedException;
import org.anuj.EvenTAura.exception.UserNotFoundException;
import org.anuj.EvenTAura.mapper.EventMapper;
import org.anuj.EvenTAura.model.*;
import org.anuj.EvenTAura.repository.EventRepository;
import org.anuj.EvenTAura.repository.HostProfileRepository;
import org.anuj.EvenTAura.repository.TicketRepository;
import org.anuj.EvenTAura.repository.UserRepository;
import org.anuj.EvenTAura.util.SseEmitterHolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Builder
@Service
@RequiredArgsConstructor
public class EventServiceImpl implements EventService {
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final TicketRepository ticketRepository;
    private final HostProfileRepository hostProfileRepository;


    @Override
    @Transactional
    public EventResponse createEvent(EventRequest req, Authentication auth) {

        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        // ================== VALIDATION ==================
        if (req.getTotalTickets() <= 0) {
            throw new IllegalArgumentException("Total tickets must be greater than 0");
        }
        if (req.getTicketsAvailable() < 0) {
            throw new IllegalArgumentException("Tickets available cannot be negative");
        }
        if (req.getTicketsAvailable() > req.getTotalTickets()) {
            throw new IllegalArgumentException("Tickets available cannot exceed total tickets");
        }
        if (req.getTicketPrice() > 0 && req.getPaymentQrUrl() == null) {
            throw new IllegalArgumentException("Payment QR required for paid events");
        }
        if (req.getTicketPrice() == 0 && req.getPaymentQrUrl() != null) {
            throw new IllegalArgumentException("Free events should not have payment QR");
        }

        // ================== ROLE CHECK ==================
        boolean isAdmin = user.getRole().equals(Role.ROLE_ADMIN);

        if (!isAdmin) {
            hostProfileRepository
                    .findTopByUserOrderByAppliedAtDesc(user)
                    .filter(p -> p.getStatus() == Status.APPROVED)
                    .orElseThrow(() -> new UnauthorizedException("Apply to become a host first"));
        }

        // ================== EVENT CREATION ==================
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

        if (!user.getUserId().equals(event.getUser().getUserId())) {
            throw new UnauthorizedException("You cannot update this event");
        }

        EventMapper.updateEventFromRequest(req, event);

        Event savedEvent = eventRepository.save(event);

        return EventMapper.toResponse(savedEvent);
    }

    @Override
    public String deleteEvent(Long eventId, Authentication auth) {

        String email = auth.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventNotExistException("No event found with this id"));

        // ADMIN: delete everything
        if (Role.ROLE_ADMIN.equals(user.getRole())) {
            ticketRepository.deleteByEvent(event);
            eventRepository.delete(event);
            return "Event successfully deleted";
        }

        // OWNER CHECK
        if (!user.getUserId().equals(event.getUser().getUserId())) {
            throw new UnauthorizedException("You cannot delete this event");
        }

        long ticketCount = ticketRepository.countByEventEventId(eventId);

        if (ticketCount > 0) {
            throw new RuntimeException("Cannot delete event because tickets are already booked");
        }

        eventRepository.delete(event);

        return "Event successfully deleted";
    }

    @Override
    public EventResponse getEvent(Long eventId) {
        return EventMapper.toResponse(eventRepository.findById(eventId)
                .orElseThrow(() -> new EventNotExistException("Event Not Found")));
    }

    @Override
    public Page<EventSummaryResponse> getAllEvents(int page, int size) {
        Sort sort = Sort.by("eventDate").ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return eventRepository.findAll(pageable)
                .map(event -> new EventSummaryResponse(
                        event.getEventId(),
                        event.getTitle(),
                        event.getLocation(),
                        event.getEventDate(),
                        event.getBannerUrl(),
                        event.getCategory(),
                        event.getTicketPrice(),
                        event.getEventStatus()
                ));
    }

    @Override
    public Page<EventResponse> getHostedEvents(int page, int size, Authentication auth) {

        Sort sort = Sort.by("eventDate").ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Page<Event> events = eventRepository.findByUser(user, pageable);

        if (events.isEmpty()) {
            throw new NoEventFoundException("You didn't hosted any event yet!!");
        }

        return events.map(EventMapper::toResponse);
    }

    @Override
    public Page<EventResponse> getJoinedEvents(int page, int size, Authentication auth) {

        Pageable pageable = PageRequest.of(page, size);

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Page<Event> events = ticketRepository.findJoinedEvents(user, pageable);

        if(events.isEmpty()){
            throw new NoEventFoundException("You didn't join any event yet!");
        }

        return events.map(EventMapper::toResponse);

    }

    @Override
    public Page<EventResponse> getHostedEventsForAdmin(int page, int size, Authentication auth) {
        Sort sort = Sort.by("eventDate").ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        System.out.println(user.getRole());
        if(!user.getRole().equals(Role.ROLE_ADMIN)){
            throw new UnauthorizedException("You can't axis events. You are not admin");
        }
        Page<Event> events = eventRepository.findAll(pageable);

        if (events.isEmpty()) {
            throw new NoEventFoundException("You didn't hosted any event yet!!");
        }

        return events.map(EventMapper::toResponse);
    }

    @Override
    public Page<EventSummaryResponse> getAllApprovedEvents(int page, int size) {
        Sort sort = Sort.by("eventDate").ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return eventRepository.findByEventStatus(
                EventStatus.APPROVED,pageable)
                .map(event -> new EventSummaryResponse(
                        event.getEventId(),
                        event.getTitle(),
                        event.getLocation(),
                        event.getEventDate(),
                        event.getBannerUrl(),
                        event.getCategory(),
                        event.getTicketPrice(),
                        event.getEventStatus() ));
    }

}
