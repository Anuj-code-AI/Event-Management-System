package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.University;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UniversityRepository extends JpaRepository<University,Long> {

    Optional<University> findByUniversityId(Long Id);
    Page<University> findByActive(boolean active, Pageable pageable);
    Optional<University> findByNameContainingIgnoreCase(String name);
    Page<University> findByActiveAndNameContainingIgnoreCase(boolean Active, String query, Pageable pageable);
    Optional<University> findByDomainIgnoreCase(String domain);
}
