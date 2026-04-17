package org.anuj.EvenTAura.service;


import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.*;
import org.anuj.EvenTAura.exception.*;
import org.anuj.EvenTAura.mapper.EventMapper;
import org.anuj.EvenTAura.mapper.TicketMapper;
import org.anuj.EvenTAura.model.*;
import org.anuj.EvenTAura.repository.EventRepository;
import org.anuj.EvenTAura.repository.TicketRepository;
import org.anuj.EvenTAura.repository.UserRepository;
import org.anuj.EvenTAura.util.QRCodeGenerator;
import org.anuj.EvenTAura.util.SseEmitterHolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;
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
    public List<TicketResponse> buyTicket(
            Long eventId,
            MultipartFile file,
            TicketRequest req,
            Authentication auth
    ) {
        // ================= USER =================
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        // ================= EVENT =================
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventNotExistException("No event found with this id"));

        // ================= VALIDATIONS =================
        if (req.getNumberOfTickets() <= 0) {
            throw new IllegalArgumentException("Ticket count must be greater than 0");
        }

        if (event.getTicketsAvailable() < req.getNumberOfTickets()) {
            throw new MaxTicketReachedException("Requested tickets exceed availability");
        }

        String paymentScreenShotUrl = null;

        if (event.getTicketPrice() > 0) {
            if (file == null || file.isEmpty()) {
                throw new IllegalArgumentException("Payment screenshot required for paid events");
            }

            // Optional: validate file type/size here
            paymentScreenShotUrl = cloudinaryService.uploadImage(file, "paymentScreenShot");
        }

        // ================= CREATE TICKETS =================
        List<Ticket> tickets = new ArrayList<>();

        for (int i = 0; i < req.getNumberOfTickets(); i++) {
            tickets.add(new Ticket(
                    null,
                    generateTicketCode(),
                    false,
                    LocalDateTime.now(),
                    null,
                    TicketStatus.ACTIVE,
                    paymentScreenShotUrl,
                    event,
                    user
            ));
        }

        // ================= UPDATE EVENT =================
        event.setTicketsAvailable(
                event.getTicketsAvailable() - req.getNumberOfTickets()
        );

        // ================= SAVE =================
        ticketRepository.saveAll(tickets);
        eventRepository.save(event);

        // ================= RESPONSE =================
        List<TicketResponse> response = tickets.stream()
                .map(ticket -> new TicketResponse(
                        ticket.getTicketId(),
                        ticket.getTicketCode(),
                        ticket.isCheckedIn(),
                        ticket.getIssuedAt(),
                        ticket.getCheckedInAt(),
                        ticket.getStatus(),
                        ticket.getEvent(),
                        ticket.getUser(),
                        "https://eventaura-iemd.onrender.com/api/v1/tickets/"
                                + ticket.getTicketId() + "/qr"
                ))
                .toList();

        // ================= REAL-TIME UPDATE =================
        SseEmitterHolder.broadcast(
                event.getEventId(),
                event.getTicketsAvailable()
        );

        return response;
    }

    @Override
    public Page<TicketResponse> myTicket(int page, int size, Authentication auth) {
        Pageable pageable = PageRequest.of(page, size);

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Page<Ticket> tickets = ticketRepository.findAllByUser(user,pageable);

        if (tickets.isEmpty()) {
            throw new NoTicketFoundException("You didn't joined any event yet!! Joined now");
        }


        return tickets.map(TicketMapper::toResponse);
    }

    @Override
    public List<Ticket> getTickets(Long eventId, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        Event event = eventRepository.findById(eventId)
                .orElseThrow(()-> new EventNotExistException("No event found with this id"));
        if(!user.getUserId().equals(event.getUser().getUserId())){
            throw new UnauthorizedException("You cannot check tickets");
        }
        List<Ticket> tickets = ticketRepository.findAllByEvent(event);
        return tickets;
    }

    @Override
    public TicketCheckResponse checkin(Long ticketCode, Authentication auth) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        // ticketCode is Long from path variable; stored ticketCode is a numeric string
        Ticket ticket = ticketRepository.findByTicketCode(String.valueOf(ticketCode))
                .orElseThrow(() -> new NoTicketFoundException("No ticket exists with this code"));

        Event event = ticket.getEvent();

        // Only the event organizer may check in tickets
        if (!user.getUserId().equals(event.getUser().getUserId())) {
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
        LocalDateTime eventDateTime = LocalDateTime.of(event.getEventDate(), event.getEventTime());
        if (eventDateTime.isBefore(LocalDateTime.now())) {
            return new TicketCheckResponse(
                    false,
                    false,
                    ticket.getStatus(),
                    "Event has already started"
            );
        }

        // Mark checked in
        ticket.setCheckedIn(true);
        ticket.setCheckedInAt(LocalDateTime.now());
        ticket.setStatus(TicketStatus.USED);
        ticketRepository.save(ticket);

        return new TicketCheckResponse(
                true,
                true,
                ticket.getStatus(),
                "Entry allowed"
        );
    }

    @Override
    public TicketCheckResponse verifyTicket(Long ticketCode, Authentication auth) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        // Same fix as checkin() — numeric string lookup
        Ticket ticket = ticketRepository.findByTicketCode(String.valueOf(ticketCode))
                .orElseThrow(() -> new NoTicketFoundException("No ticket exists with this code"));

        Event event = ticket.getEvent();

        if (!user.getUserId().equals(event.getUser().getUserId())) {
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

        LocalDateTime eventDateTime = LocalDateTime.of(event.getEventDate(), event.getEventTime());
        if (eventDateTime.isBefore(LocalDateTime.now())) {
            return new TicketCheckResponse(
                    false,
                    false,
                    ticket.getStatus(),
                    "Event already started or finished"
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
    public TicketCancelResponse cancelTicket(Long ticketId, Authentication auth) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new NoTicketFoundException("Ticket not found"));

        // ensure the ticket belongs to the user
        if(!ticket.getUser().getUserId().equals(user.getUserId())){
            throw new RuntimeException("You cannot cancel this ticket");
        }

        // ticket already used
        if(ticket.getStatus() == TicketStatus.USED){
            throw new RuntimeException("Used ticket cannot be cancelled");
        }

        // ticket already cancelled
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
    public TicketResponse getMyTicket(Long ticketId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(()-> new NoTicketFoundException("No ticket found with this exception"));
        return TicketMapper.toResponse(ticket);
    }

    @Override
    public Page<AudienceResponse> audienceList(int page, int size, Long eventId, Authentication authentication) {

        Sort sort = Sort.by("issuedAt").ascending(); // might not exist in Ticket btw
        Pageable pageable = PageRequest.of(page, size, sort);

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new EventNotExistException("Event not found"));

        boolean isOwner = user.getUserId().equals(event.getUser().getUserId());
        boolean isAdmin = user.getRole().equals(Role.ROLE_ADMIN);

        if (!(isOwner || isAdmin)) {
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
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(()-> new NoTicketFoundException("Ticket not found"));

        Event event = ticket.getEvent();

        // ensure the logged-in user is the organizer of this event
        boolean isOwner = user.getUserId().equals(event.getUser().getUserId());
        boolean isAdmin = user.getRole().equals(Role.ROLE_ADMIN);

        if (!(isOwner || isAdmin)) {
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

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new NoTicketFoundException("Ticket not found"));

        Event event = ticket.getEvent();

        // authorization check
        boolean isOwner = user.getUserId().equals(event.getUser().getUserId());
        boolean isAdmin = user.getRole().equals(Role.ROLE_ADMIN);

        if (!(isOwner || isAdmin)) {
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
