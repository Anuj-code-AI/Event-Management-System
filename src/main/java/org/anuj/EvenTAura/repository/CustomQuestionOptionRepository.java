package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.CustomFormQuestion;
import org.anuj.EvenTAura.model.CustomQuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomQuestionOptionRepository extends JpaRepository<CustomQuestionOption, Long> {
    List<CustomQuestionOption> findByQuestionOrderByDisplayOrderAsc(
            CustomFormQuestion question
    );
}
