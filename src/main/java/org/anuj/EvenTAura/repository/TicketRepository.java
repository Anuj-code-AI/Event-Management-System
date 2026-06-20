package org.anuj.EvenTAura.repository;


import org.anuj.EvenTAura.model.Event;
import org.anuj.EvenTAura.model.Ticket;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.model.enums.TicketStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TicketRepository extends JpaRepository<Ticket,Long> {
    Optional<Ticket> findByTicketCode(String ticketCode);
    Page<Ticket> findAllByUser(User user, Pageable pageable);
    List<Ticket> findAllByEvent(Event event);
    @Query("""
SELECT DISTINCT t.event
FROM Ticket t
WHERE t.user = :user
AND t.status <> :status
""")
    Page<Event> findJoinedEvents(User user,
                                 TicketStatus status,
                                 Pageable pageable);
    long countByEventEventId(Long eventId);
    void deleteByEvent(Event event);
    Page<Ticket> findByEvent(Event event, Pageable pageable);
    boolean existsByEventAndUser(Event event, User user);
    Optional<Ticket> findByEventAndUser(Event event, User user);
}
