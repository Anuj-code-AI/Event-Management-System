package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.HostApplication;
import org.anuj.EvenTAura.model.University;
import org.anuj.EvenTAura.model.enums.HostStatus;
import org.anuj.EvenTAura.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HostApplicationRepository extends JpaRepository<HostApplication,Long> {
    boolean existsByUserAndStatus(User user, HostStatus status);
    boolean existsByUser_UserIdAndStatus(Long userId, HostStatus status);
    List<HostApplication> findByUser_UniversityAndStatus(
            University university,
            HostStatus status
    );
    Optional<HostApplication> findTopByUserOrderByAppliedAtDesc(User user);
}
