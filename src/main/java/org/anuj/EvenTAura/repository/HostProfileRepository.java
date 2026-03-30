package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.HostProfile;
import org.anuj.EvenTAura.model.Status;
import org.anuj.EvenTAura.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HostProfileRepository extends JpaRepository<HostProfile,Long> {
    boolean existsByUserAndStatus(User user, Status status);
    List<HostProfile> findByStatus(Status status);
    Optional<HostProfile> findTopByUserOrderByAppliedAtDesc(User user);
}
