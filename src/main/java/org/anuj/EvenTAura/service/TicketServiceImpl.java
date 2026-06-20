package org.anuj.EvenTAura.service;


import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.*;
import org.anuj.EvenTAura.exception.AllExceptions.*;
import org.anuj.EvenTAura.mapper.TicketMapper;
import org.anuj.EvenTAura.model.*;
import org.anuj.EvenTAura.model.enums.TicketStatus;
import org.anuj.EvenTAura.repository.EventRepository;
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
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class TicketServiceImpl implements TicketService{
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final CloudinaryService cloudinaryService;

    private String generateTicketCode() {
        // Numeric code: fits in a Long, unique enough for tickets
        long code = ThreadLocalRandom.current().nextLong(100_000_000_000L, 999_999_999_999L);
        return String.valueOf(code);
    }

    @Override
    @Transactional
    public TicketResponse buyTicket(
            Long eventId,
            MultipartFile file,
            Authentication authentication
    ) {

        // ================= USER =================
        CustomUserDetails userDetails =
                (CustomUserDetails) authentication.getPrincipal();

        User user = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() ->
                        new UserNotFoundException("User not found"));

        // ================= EVENT =================
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() ->
                        new EventNotExistException("No event found with this id"));

        // ================= TICKET AVAILABILITY =================
        if (event.getTicketsAvailable() <= 0) {
            throw new RuntimeException("Event is sold out");
        }

        // ================= PAYMENT VALIDATION =================
        String paymentScreenShotUrl = null;

        if (event.getTicketPrice() > 0) {

            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException(
                        "Payment screenshot required for paid events"
                );
            }

            paymentScreenShotUrl =
                    cloudinaryService.uploadImage(file, "paymentScreenShot");
        }

        // ================= EXISTING TICKET CHECK =================
        Optional<Ticket> existingTicket =
                ticketRepository.findByEventAndUser(event, user);

        if (existingTicket.isPresent()) {

            Ticket ticket = existingTicket.get();

            // User already has an active ticket
            if (ticket.getStatus() == TicketStatus.ACTIVE) {
                throw new RuntimeException(
                        "You are already registered for this event"
                );
            }

            // Re-activate cancelled ticket
            if (ticket.getStatus() == TicketStatus.CANCELLED) {

                ticket.setStatus(TicketStatus.ACTIVE);
                ticket.setIssuedAt(LocalDateTime.now());
                ticket.setCheckedIn(false);
                ticket.setCheckedInAt(null);

                if (event.getTicketPrice() > 0) {
                    ticket.setPaymentScreenShotUrl(paymentScreenShotUrl);
                }

                event.setTicketsAvailable(
                        event.getTicketsAvailable() - 1
                );

                eventRepository.save(event);
                ticketRepository.save(ticket);

                return TicketMapper.toResponse(ticket);
            }

            throw new RuntimeException(
                    "Ticket cannot be reactivated in current state"
            );
        }

        // ================= CREATE NEW TICKET =================
        Ticket ticket = new Ticket(
                null,
                generateTicketCode(),
                false,
                LocalDateTime.now(),
                null,
                TicketStatus.ACTIVE,
                paymentScreenShotUrl,
                event,
                user
        );

        // ================= UPDATE EVENT =================
        event.setTicketsAvailable(
                event.getTicketsAvailable() - 1
        );

        // ================= SAVE =================
        eventRepository.save(event);
        ticketRepository.save(ticket);

        return TicketMapper.toResponse(ticket);
    }
    @Override
    public Page<TicketResponse> myTickets(int page, int size, Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Sort sort = Sort.by("issuedAt").ascending();
        Pageable pageable = PageRequest.of(page, size);

        Page<Ticket> tickets = ticketRepository.findAllByUser(user,pageable);

        if (tickets.isEmpty()) {
            throw new NoTicketFoundException("You didn't joined any event yet!! Join now");
        }

        return tickets.map(TicketMapper::toResponse);
    }

    @Override
    public List<Ticket> getTickets(Long eventId, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Event event = eventRepository.findById(eventId)
                .orElseThrow(()-> new EventNotExistException("No event found with this id"));
        boolean isHod = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_HOD"));
        if(!userDetails.getId().equals(event.getUser().getUserId()) && !isHod){
            throw new UnauthorizedException("You cannot check tickets");
        }
        return ticketRepository.findAllByEvent(event);
    }

    @Override
    @Transactional
    public TicketCheckResponse checkin(Long ticketCode, Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        // ticketCode is Long from path variable; stored ticketCode is a numeric string
        Ticket ticket = ticketRepository.findByTicketCode(String.valueOf(ticketCode))
                .orElseThrow(() -> new NoTicketFoundException("No ticket exists with this code"));

        Event event = ticket.getEvent();

        boolean isHOD = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_HOD"));

        // Only the event organizer or HOD may check in tickets
        if (!userDetails.getId().equals(event.getUser().getUserId()) && !isHOD) {
            throw new RuntimeException("You are not allowed to check in tickets for this event");
        }

        // Already checked in
        if (ticket.isCheckedIn()) {
            return new TicketCheckResponse(
                    false,
                    true,
                    ticket.getStatus(),
                    "Ticket already used"
            );
        }

        // Event must not have started yet
        if (LocalDate.now().isAfter(event.getEventDate())) {
            return new TicketCheckResponse(
                    false,
                    false,
                    ticket.getStatus(),
                    "Event has already ended"
            );
        }

        // Mark checked in
        ticket.setCheckedIn(true);
        ticket.setCheckedInAt(LocalDateTime.now());
        ticket.setStatus(TicketStatus.USED);
        return new TicketCheckResponse(
                true,
                true,
                ticket.getStatus(),
                "Entry allowed"
        );
    }

    @Override
    public TicketCheckResponse verifyTicket(Long ticketCode, Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        // Same fix as checkin() — numeric string lookup
        Ticket ticket = ticketRepository.findByTicketCode(String.valueOf(ticketCode))
                .orElseThrow(() -> new NoTicketFoundException("No ticket exists with this code"));

        Event event = ticket.getEvent();

        boolean isHOD = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_HOD"));

        // Only the event organizer or HOD may check in tickets
        if (!userDetails.getId().equals(event.getUser().getUserId()) && !isHOD) {
            throw new RuntimeException("You are not allowed to verify tickets for this event");
        }

        if (ticket.isCheckedIn()) {
            // No need to save here — just reporting status, not mutating
            return new TicketCheckResponse(
                    false,
                    true,
                    ticket.getStatus(),
                    "Ticket already used"
            );
        }

        // Event must not have started yet
        if (LocalDate.now().isAfter(event.getEventDate())) {
            return new TicketCheckResponse(
                    false,
                    false,
                    ticket.getStatus(),
                    "Event has already ended"
            );
        }

        return new TicketCheckResponse(
                true,
                false,
                ticket.getStatus(),
                "Ticket is valid"
        );
    }

    @Override
    @Transactional
    public TicketCancelResponse cancelTicket(Long ticketId, Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new NoTicketFoundException("Ticket not found"));

        // ensure the ticket belongs to the user
        if(!ticket.getUser().getUserId().equals(userDetails.getId())){
            throw new RuntimeException("You cannot cancel this ticket");
        }

        // ticket already used
        if(ticket.getStatus() == TicketStatus.USED){
            throw new RuntimeException("Used ticket cannot be cancelled");
        }

        // ticket already canceled
        if(ticket.getStatus() == TicketStatus.CANCELLED){
            throw new RuntimeException("Ticket already cancelled");
        }

        Event event = ticket.getEvent();

        // update ticket status
        ticket.setStatus(TicketStatus.CANCELLED);

        // increase available tickets
        event.setTicketsAvailable(event.getTicketsAvailable() + 1);


        ticketRepository.save(ticket);
        eventRepository.save(event);

        return new TicketCancelResponse(
                ticket.getTicketId(),
                "Ticket cancelled successfully"
        );
    }

    @Override
    public TicketResponse getMyTicket(Long ticketId, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new NoTicketFoundException("Ticket not found"));

        // ensure the ticket belongs to the user
        if(!ticket.getUser().getUserId().equals(userDetails.getId())){
            throw new RuntimeException("No ticket found");
        }

        return TicketMapper.toResponse(ticket);
    }

    @Override
    public Page<AudienceResponse> audienceList(int page, int size, Long eventId, Authentication authentication) {

        Sort sort = Sort.by("issuedAt").ascending(); // might not exist in Ticket btw
        Pageable pageable = PageRequest.of(page, size, sort);

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventNotExistException("Event not found"));

        boolean isOwner = userDetails.getId().equals(event.getUser().getUserId());
        boolean isHOD = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_HOD"));


        if (!isOwner && !isHOD) {
            throw new RuntimeException("You are not allowed to verify tickets for this event");
        }

        Page<Ticket> tickets = ticketRepository.findByEvent(event, pageable);

        return tickets.map(ticket -> {
            AudienceResponse res = new AudienceResponse();
            res.setTicketId(ticket.getTicketId());
            res.setName(ticket.getUser().getName());
            res.setEmail(ticket.getUser().getEmail());
            res.setStatus(ticket.getStatus());
            res.setCheckedIn(ticket.isCheckedIn());
            res.setCheckedInAt(ticket.getCheckedInAt());
            return res;
        });
    }

    @Override
    @Transactional
    public void markPresent(Long ticketId, Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(()-> new NoTicketFoundException("Ticket not found"));

        Event event = ticket.getEvent();

        // ensure the logged-in user is either the organizer of this event or the HOD
        boolean isOwner = userDetails.getId().equals(event.getUser().getUserId());
        boolean isHOD = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_HOD"));

        if (!isOwner && !isHOD) {
            throw new RuntimeException("You are not allowed to verify tickets for this event");
        }
        if (ticket.isCheckedIn()) {
            throw new RuntimeException("Ticket already marked present");
        }

        ticket.setCheckedIn(true);
        ticket.setCheckedInAt(LocalDateTime.now());
        ticket.setStatus(TicketStatus.USED);
        ticketRepository.save(ticket);
    }

    @Override
    @Transactional
    public void markAbsent(Long ticketId, Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(()-> new NoTicketFoundException("Ticket not found"));

        Event event = ticket.getEvent();

        // ensure the logged-in user is either the organizer of this event or the HOD
        boolean isOwner = userDetails.getId().equals(event.getUser().getUserId());
        boolean isHOD = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_HOD"));

        if (!isOwner && !isHOD) {
            throw new RuntimeException("You are not allowed to verify tickets for this event");
        }

        // must already be checked in
        if (!ticket.isCheckedIn()) {
            throw new RuntimeException("Ticket is not marked present");
        }

        // revert attendance
        ticket.setCheckedIn(false);
        ticket.setCheckedInAt(null);

        // optional: revert status
        ticket.setStatus(TicketStatus.ACTIVE);
        ticketRepository.save(ticket);


    }
}
