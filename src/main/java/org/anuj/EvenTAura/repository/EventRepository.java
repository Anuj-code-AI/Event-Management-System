package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EventRepository extends JpaRepository<Event,Long> {
    Optional<Event> findByTitle(String title);
    Optional<Event> findByClub(String club);
    Optional<Event> findById(Long eventId);
}
