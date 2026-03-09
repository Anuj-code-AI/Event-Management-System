package org.anuj.EvenTAura.service;


import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.TicketCancelResponse;
import org.anuj.EvenTAura.dto.TicketCheckResponse;
import org.anuj.EvenTAura.dto.TicketRequest;
import org.anuj.EvenTAura.dto.TicketResponse;
import org.anuj.EvenTAura.exception.EventNotExistException;
import org.anuj.EvenTAura.exception.NoTicketFoundException;
import org.anuj.EvenTAura.exception.UnauthorizedException;
import org.anuj.EvenTAura.exception.UserNotFoundException;
import org.anuj.EvenTAura.mapper.TicketMapper;
import org.anuj.EvenTAura.model.Event;
import org.anuj.EvenTAura.model.Ticket;
import org.anuj.EvenTAura.model.TicketStatus;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.repository.EventRepository;
import org.anuj.EvenTAura.repository.TicketRepository;
import org.anuj.EvenTAura.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class TicketServiceImpl implements TicketService{
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;

    @Override
    public List<Ticket> buyTicket(Long eventId, TicketRequest req, Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        Event event = eventRepository.findById(eventId)
                .orElseThrow(()-> new EventNotExistException("No event found with this id"));
        List<Ticket> tickets  = new ArrayList<>();
        Random rand = new Random();
        for(int i=0;i<req.getQuantity();i++){
            int code = 1000+rand.nextInt(9000);
            tickets.add(new Ticket(null,Integer.toString(code),false, LocalDateTime.now(),null, TicketStatus.ACTIVE,event,user));
        }
        return ticketRepository.saveAll(tickets);

    }

    @Override
    public List<Ticket> myTicket(Authentication auth) {
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        List<Ticket> tickets = ticketRepository.findAllByUser(user);
        return tickets;
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

        Ticket ticket = ticketRepository.findByTicketCode(Long.toString(ticketCode))
                .orElseThrow(() -> new NoTicketFoundException("No ticket exists with this code"));

        Event event = ticket.getEvent();

        // check organizer permission
        if(!user.getUserId().equals(event.getUser().getUserId())){
            throw new RuntimeException("You are not allowed to check in tickets for this event");
        }

        // check if ticket already used
        if(ticket.isCheckedIn()){
            ticket.setStatus(TicketStatus.USED);
            return new TicketCheckResponse(false, true, ticket.getStatus(),"Ticket already used");
        }

        // check event time
        LocalDateTime eventDateTime =
                LocalDateTime.of(event.getEventDate(), event.getEventTime());

        if(eventDateTime.isBefore(LocalDateTime.now())){
            return new TicketCheckResponse(false, false, ticket.getStatus(),"Event already started");
        }

        // mark ticket checked in
        ticket.setCheckedIn(true);
        ticket.setCheckedInAt(LocalDateTime.now());

        ticketRepository.save(ticket);

        return new TicketCheckResponse(true, true, ticket.getStatus(),"Entry allowed");
    }

    @Override
    public TicketCheckResponse verifyTicket(Long ticketCode, Authentication auth) {

        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Ticket ticket = ticketRepository.findByTicketCode(Long.toString(ticketCode))
                .orElseThrow(() -> new NoTicketFoundException("No ticket exists with this code"));

        Event event = ticket.getEvent();

        // ensure the logged-in user is the organizer of this event
        if(!user.getUserId().equals(event.getUser().getUserId())){
            throw new RuntimeException("You are not allowed to verify tickets for this event");
        }

        // check if ticket already used
        if(ticket.isCheckedIn()){
            ticket.setStatus(TicketStatus.USED);
            return new TicketCheckResponse(
                    false,
                    true,
                    ticket.getStatus(),
                    "Ticket already used"
            );
        }

        // check if event already finished
        LocalDateTime eventDateTime =
                LocalDateTime.of(event.getEventDate(), event.getEventTime());

        if(eventDateTime.isBefore(LocalDateTime.now())){
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
}
