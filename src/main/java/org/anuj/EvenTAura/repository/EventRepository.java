package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.Event;
import org.anuj.EvenTAura.model.EventStatus;
import org.anuj.EvenTAura.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event,Long> {
    Optional<Event> findById(Long eventId);
    void deleteByUser(User user);
    Page<Event> findByUser(User user, Pageable pageable);
    List<Event> findByEventStatus(EventStatus status);
    Page<Event> findByEventStatus(EventStatus status,Pageable pageable);
}
