package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User,Long> {
    Optional<User> findByPrimaryEmail(String primaryEmail);
    Optional<User> findBySecondaryEmail(String secondaryEmail);
    Optional<User> findByUserId(Long userId);
    Page<User> findAllByIsActive(boolean isActive, Pageable pageable);
    Page<User> findAllByIsActiveAndNameContainingIgnoreCase(boolean isActive, String name, Pageable pageable);
}
