package org.anuj.EvenTAura.repository;


import org.anuj.EvenTAura.model.Event;
import org.anuj.EvenTAura.model.Ticket;
import org.anuj.EvenTAura.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket,Long> {
    Optional<Ticket> findByTicketCode(String ticketCode);
    List<Ticket> findAllByUser(User user);
    List<Ticket> findAllByEvent(Event event);
}
