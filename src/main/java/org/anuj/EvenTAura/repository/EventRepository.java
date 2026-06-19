package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.Event;
import org.anuj.EvenTAura.model.University;
import org.anuj.EvenTAura.model.enums.EventStatus;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.model.enums.ParticipationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event,Long> {
    Optional<Event> findById(Long eventId);
    Page<Event> findByUser(User user, Pageable pageable);
    Page<Event> findByParticipationType(ParticipationType participationType, Pageable pageable);
    Page<Event> findByEventStatusAndUniversity(EventStatus status, University university, Pageable pageable);
    List<Event> findByEventStatusAndUniversity(EventStatus status, University university);
    Page<Event> findByParticipationTypeAndTitleContainingIgnoreCase(
            ParticipationType participationType,
            String title,
            Pageable pageable
    );
}

