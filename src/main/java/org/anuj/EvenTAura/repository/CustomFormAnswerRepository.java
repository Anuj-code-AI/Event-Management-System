package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.CustomFormAnswer;
import org.anuj.EvenTAura.model.CustomFormQuestion;
import org.anuj.EvenTAura.model.CustomFormSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomFormAnswerRepository extends JpaRepository<CustomFormAnswer, Long> {
    List<CustomFormAnswer> findBySubmission(CustomFormSubmission submission);

    List<CustomFormAnswer> findByQuestion(CustomFormQuestion question);
}
