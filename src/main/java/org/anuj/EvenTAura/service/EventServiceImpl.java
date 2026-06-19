package org.anuj.EvenTAura.service;

import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.EventRequest;
import org.anuj.EvenTAura.dto.EventResponse;
import org.anuj.EvenTAura.dto.EventSummaryResponse;
import org.anuj.EvenTAura.dto.EventUpdateRequest;
import org.anuj.EvenTAura.exception.AllExceptions.EventNotExistException;
import org.anuj.EvenTAura.exception.AllExceptions.UnauthorizedException;
import org.anuj.EvenTAura.exception.AllExceptions.UserNotFoundException;
import org.anuj.EvenTAura.mapper.EventMapper;
import org.anuj.EvenTAura.model.*;
import org.anuj.EvenTAura.model.enums.EventStatus;
import org.anuj.EvenTAura.model.enums.ParticipationType;
import org.anuj.EvenTAura.model.enums.SystemRole;
import org.anuj.EvenTAura.model.enums.HostStatus;
import org.anuj.EvenTAura.repository.EventRepository;
import org.anuj.EvenTAura.repository.HostApplicationRepository;
import org.anuj.EvenTAura.repository.TicketRepository;
import org.anuj.EvenTAura.repository.UserRepository;
import org.anuj.EvenTAura.security.CustomUserDetails;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;


@Builder
@Service
@RequiredArgsConstructor
public class EventServiceImpl implements EventService {
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final TicketRepository ticketRepository;
    private final HostApplicationRepository hostApplicationRepository;


    @Override
    @Transactional
    public EventResponse createEvent(EventRequest req, Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userRepository.findByUserId(userDetails.getId())
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
        boolean isHOD = user.getSystemRole().equals(SystemRole.HOD);

        if (!isHOD) {
            hostApplicationRepository
                    .findTopByUserOrderByAppliedAtDesc(user)
                    .filter(p -> p.getStatus() == HostStatus.APPROVED)
                    .orElseThrow(() -> new UnauthorizedException("Apply to become a host first"));
        }

        // ================== EVENT CREATION ==================
        Event event = EventMapper.toEntity(req, user);
        Event savedEvent = eventRepository.save(event);
        return EventMapper.toResponse(savedEvent);
    }

    // Update event service
    @Override
    @Transactional
    public EventResponse updateEvent(Long eventId, EventUpdateRequest req, Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventNotExistException("No event found with this id"));

        boolean isHOD = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_HOD"));

        if (!userDetails.getId().equals(event.getUser().getUserId()) && !isHOD) {
            throw new UnauthorizedException("You cannot update this event");
        }

        EventMapper.updateEventFromRequest(req, event);
        return EventMapper.toResponse(event);
    }

    // Delete event service
    @Override
    @Transactional
    public Void deleteEvent(Long eventId, Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventNotExistException("No event found with this id"));

        boolean isHOD = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_HOD"));

        // OWNER CHECK
        if (!userDetails.getId().equals(event.getUser().getUserId()) && !isHOD) {
            throw new UnauthorizedException("You cannot delete this event");
        }

        long ticketCount = ticketRepository.countByEventEventId(eventId);

        if (ticketCount > 0) {
            throw new RuntimeException("You cannot delete event instead cancel it");
        }

        event.setEventStatus(EventStatus.DELETED);
        return null;
    }

    // Cancel event service
    @Override
    @Transactional
    public Void cancelEvent(Long eventId, Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventNotExistException("No event found with this id"));

        boolean isHOD = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_HOD"));

        // OWNER CHECK
        if (!userDetails.getId().equals(event.getUser().getUserId()) && !isHOD) {
            throw new UnauthorizedException("You cannot delete this event");
        }

        event.setEventStatus(EventStatus.CANCELLED);
        return null;
    }

    // Get full event details by event id
    @Override
    public EventResponse getEvent(Long eventId) {
        return EventMapper.toResponse(eventRepository.findById(eventId)
                .orElseThrow(() -> new EventNotExistException("Event Not Found")));
    }

    // Get all global events
    @Override
    public Page<EventSummaryResponse> getGlobalEvents(
            String query,
            int page,
            int size
    ) {
        Sort sort = Sort.by("eventDate").ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Event> events;

        if (query == null || query.isBlank()) {
            events = eventRepository.findByParticipationType(
                    ParticipationType.PUBLIC,
                    pageable
            );
        } else {
            events = eventRepository
                    .findByParticipationTypeAndTitleContainingIgnoreCase(
                            ParticipationType.PUBLIC,
                            query,
                            pageable
                    );
        }

        return events.map(event -> new EventSummaryResponse(
                event.getEventId(),
                event.getTitle(),
                event.getLocation(),
                event.getLastRegistrationDate(),
                event.getBannerUrl(),
                event.getCategory(),
                event.getTicketPrice(),
                event.getEventStatus()
        ));
    }

    // Get all university events
    @Override
    public Page<EventSummaryResponse> getUniversityEvents(int page, int size, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        Sort sort = Sort.by("eventDate").ascending();
        Pageable pageable = PageRequest.of(page, size, sort);
        return eventRepository.findByEventStatusAndUniversity(EventStatus.APPROVED, user.getUniversity(), pageable)
                .map(event -> new EventSummaryResponse(
                        event.getEventId(),
                        event.getTitle(),
                        event.getLocation(),
                        event.getLastRegistrationDate(),
                        event.getBannerUrl(),
                        event.getCategory(),
                        event.getTicketPrice(),
                        event.getEventStatus()
                ));
    }


    // Get hosted events
    @Override
    public Page<EventSummaryResponse> getHostedEvents(int page, int size, Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Sort sort = Sort.by("eventDate").ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        return eventRepository.findByUser(user, pageable)
                .map(event -> new EventSummaryResponse(
                        event.getEventId(),
                        event.getTitle(),
                        event.getLocation(),
                        event.getLastRegistrationDate(),
                        event.getBannerUrl(),
                        event.getCategory(),
                        event.getTicketPrice(),
                        event.getEventStatus()
                ));
    }

    // Get joined events
    @Override
    public Page<EventSummaryResponse> getJoinedEvents(int page, int size, Authentication auth) {

        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        User user = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(()->new UserNotFoundException("user not found"));

        Pageable pageable = PageRequest.of(page, size);

        return ticketRepository.findJoinedEvents(user, pageable)
                .map(event -> new EventSummaryResponse(
                        event.getEventId(),
                        event.getTitle(),
                        event.getLocation(),
                        event.getLastRegistrationDate(),
                        event.getBannerUrl(),
                        event.getCategory(),
                        event.getTicketPrice(),
                        event.getEventStatus()
                ));
    }



}
