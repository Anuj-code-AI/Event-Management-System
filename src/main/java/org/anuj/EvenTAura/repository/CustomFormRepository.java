package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.CustomForm;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.model.University;
import org.anuj.EvenTAura.model.enums.FormStatus;
import org.anuj.EvenTAura.model.enums.ParticipationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;


@Repository
public interface CustomFormRepository extends JpaRepository<CustomForm, Long> {

    Page<CustomForm> findByCreatedBy(User createdBy, Pageable pageable);

    Optional<CustomForm> findByUniqueId(String formId);

    Page<CustomForm> findByStatusAndParticipationType(
            FormStatus status,
            ParticipationType participationType,
            Pageable pageable
    );

    @Query("""
SELECT f
FROM CustomForm f
WHERE f.status = :status
AND f.participationType = :participationType
AND (
    LOWER(f.title) LIKE LOWER(CONCAT('%', :query, '%'))
    OR LOWER(f.description) LIKE LOWER(CONCAT('%', :query, '%'))
)
""")
    Page<CustomForm> search(
            @Param("query") String query,
            @Param("status") FormStatus status,
            @Param("participationType") ParticipationType participationType,
            Pageable pageable
    );

    Page<CustomForm> findByUniversityAndStatusAndParticipationType(
            University university,
            FormStatus status,
            ParticipationType participationType,
            Pageable pageable
    );

    @Query("""
SELECT f
FROM CustomForm f
WHERE f.university = :university
AND f.status = :status
AND f.participationType = :participationType
AND (
    LOWER(f.title) LIKE LOWER(CONCAT('%', :query, '%'))
    OR LOWER(f.description) LIKE LOWER(CONCAT('%', :query, '%'))
)
""")
    Page<CustomForm> searchByUniversity(
            @Param("query") String query,
            @Param("university") University university,
            @Param("status") FormStatus status,
            @Param("participationType") ParticipationType participationType,
            Pageable pageable
    );

    Page<CustomForm> findByUniversityAndStatus(
            University university,
            FormStatus status,
            Pageable pageable
    );

    Page<CustomForm> findByUniversityAndStatusIn(
            University university,
            java.util.Collection<FormStatus> statuses,
            Pageable pageable
    );

    @Query("""
SELECT f
FROM CustomForm f
WHERE f.university = :university
AND f.status = :status
AND (
    LOWER(f.title) LIKE LOWER(CONCAT('%', :query, '%'))
    OR LOWER(f.description) LIKE LOWER(CONCAT('%', :query, '%'))
)
""")
    Page<CustomForm> searchByUniversityAndStatus(
            @Param("university") University university,
            @Param("status") FormStatus status,
            @Param("query") String query,
            Pageable pageable
    );

    @Query("""
SELECT f
FROM CustomForm f
WHERE f.university = :university
AND f.status IN :statuses
AND (
    LOWER(f.title) LIKE LOWER(CONCAT('%', :query, '%'))
    OR LOWER(f.description) LIKE LOWER(CONCAT('%', :query, '%'))
)
""")
    Page<CustomForm> searchByUniversityAndStatusIn(
            @Param("university") University university,
            @Param("statuses") java.util.Collection<FormStatus> statuses,
            @Param("query") String query,
            Pageable pageable
    );
}