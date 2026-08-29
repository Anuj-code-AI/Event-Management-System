package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.EmailJob;
import org.anuj.EvenTAura.model.enums.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface EmailJobRepository extends JpaRepository<EmailJob, Long> {

    List<EmailJob> findByStatusAndScheduledAtLessThanEqual(
            JobStatus status,
            LocalDateTime time
    );



}
