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
import org.anuj.EvenTAura.model.enums.*;
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

import java.util.List;


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

        // OWNER CHECK OR HOD OF SAME UNIVERSITY
        if (!userDetails.getId().equals(event.getUser().getUserId())) {
            if (isHOD) {
                User hod = userRepository.findById(userDetails.getId())
                        .orElseThrow(() -> new UserNotFoundException("User not found"));
                if (hod.getUniversity() == null || event.getUniversity() == null || !hod.getUniversity().equals(event.getUniversity())) {
                    throw new UnauthorizedException("You can only delete events within your own university.");
                }
            } else {
                throw new UnauthorizedException("You cannot delete this event");
            }
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

        // OWNER CHECK OR HOD OF SAME UNIVERSITY
        if (!userDetails.getId().equals(event.getUser().getUserId())) {
            if (isHOD) {
                User hod = userRepository.findById(userDetails.getId())
                        .orElseThrow(() -> new UserNotFoundException("User not found"));
                if (hod.getUniversity() == null || event.getUniversity() == null || !hod.getUniversity().equals(event.getUniversity())) {
                    throw new UnauthorizedException("You can only cancel events within your own university.");
                }
            } else {
                throw new UnauthorizedException("You cannot cancel this event");
            }
        }

        event.setEventStatus(EventStatus.CANCELLED);
        return null;
    }

    // Uncancel event service
    @Override
    @Transactional
    public Void uncancelEvent(Long eventId, Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventNotExistException("No event found with this id"));

        boolean isHOD = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_HOD"));

        // OWNER CHECK OR HOD OF SAME UNIVERSITY
        if (!userDetails.getId().equals(event.getUser().getUserId())) {
            if (isHOD) {
                User hod = userRepository.findById(userDetails.getId())
                        .orElseThrow(() -> new UserNotFoundException("User not found"));
                if (hod.getUniversity() == null || event.getUniversity() == null || !hod.getUniversity().equals(event.getUniversity())) {
                    throw new UnauthorizedException("You can only reactivate events within your own university.");
                }
            } else {
                throw new UnauthorizedException("You cannot reactivate this event");
            }
        }

        event.setEventStatus(EventStatus.APPROVED);
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
        List<EventStatus> statuses = List.of(
                EventStatus.APPROVED,
                EventStatus.FINISHED
        );
        if (query == null || query.isBlank()) {
            events = eventRepository.findByParticipationTypeAndEventStatusIn(
                    ParticipationType.PUBLIC,
                    statuses,
                    pageable
            );
        } else {
            events = eventRepository
                    .findByParticipationTypeAndEventStatusInAndTitleContainingIgnoreCase(
                            ParticipationType.PUBLIC,
                            statuses,
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
                event.getEventStatus(),
                event.getUniversity() != null ? event.getUniversity().getLogoUrl() : null
        ));
    }

    // Get all university events
    @Override
    public Page<EventSummaryResponse> getUniversityEvents(int page, int size, String query, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        Sort sort = Sort.by("eventDate").ascending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Event> events;

        List<EventStatus> statuses = List.of(
                EventStatus.APPROVED,
                EventStatus.FINISHED
        );

        if (query == null || query.isBlank()) {
            events = eventRepository.findByEventStatusInAndUniversity(
                    statuses,
                    user.getUniversity(),
                    pageable
            );
        } else {
            events = eventRepository.findByUniversityAndEventStatusInAndTitleContainingIgnoreCase(
                    user.getUniversity(),
                    statuses,
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
                event.getEventStatus(),
                event.getUniversity() != null ? event.getUniversity().getLogoUrl() : null
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
                        event.getEventStatus(),
                        event.getUniversity() != null ? event.getUniversity().getLogoUrl() : null
                ));
    }

    // Get joined events
    @Override
    public Page<EventSummaryResponse> getJoinedEvents(int page, int size, Authentication auth) {

        CustomUserDetails userDetails = (CustomUserDetails) auth.getPrincipal();
        User user = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(()->new UserNotFoundException("user not found"));

        Pageable pageable = PageRequest.of(page, size);

        return ticketRepository.findJoinedEvents(
                        user,
                        TicketStatus.CANCELLED,
                        pageable
                )
                .map(event -> new EventSummaryResponse(
                        event.getEventId(),
                        event.getTitle(),
                        event.getLocation(),
                        event.getLastRegistrationDate(),
                        event.getBannerUrl(),
                        event.getCategory(),
                        event.getTicketPrice(),
                        event.getEventStatus(),
                        event.getUniversity() != null
                                ? event.getUniversity().getLogoUrl()
                                : null
                ));

    }



}
