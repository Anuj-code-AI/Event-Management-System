
package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.CustomForm;
import org.anuj.EvenTAura.model.CustomFormQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomFormQuestionRepository extends JpaRepository<CustomFormQuestion, Long> {
    List<CustomFormQuestion> findByCustomFormOrderByDisplayOrderAsc(CustomForm customForm);
}
