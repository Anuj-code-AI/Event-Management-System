package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.CustomForm;
import org.anuj.EvenTAura.model.CustomFormSubmission;
import org.anuj.EvenTAura.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomFormSubmissionRepository extends JpaRepository<CustomFormSubmission, Long> {
    Page<CustomFormSubmission> findByCustomForm(CustomForm customForm, Pageable pageable);
    List<CustomFormSubmission> findByCustomForm(CustomForm customForm);
    @Query("""
SELECT s
FROM CustomFormSubmission s
WHERE s.customForm = :form
AND (
LOWER(s.submittedBy.name) LIKE LOWER(CONCAT('%',:query,'%'))
OR
LOWER(s.submittedBy.primaryEmail) LIKE LOWER(CONCAT('%',:query,'%'))
)
""")
    Page<CustomFormSubmission> search(
            @Param("form") CustomForm form,
            @Param("query") String query,
            Pageable pageable
    );
    Page<CustomFormSubmission> findBySubmittedBy(User submittedBy, Pageable pageable);

    boolean existsByCustomFormAndSubmittedBy(
            CustomForm customForm,
            User submittedBy
    );

    long countByCustomForm(CustomForm customForm);
}
