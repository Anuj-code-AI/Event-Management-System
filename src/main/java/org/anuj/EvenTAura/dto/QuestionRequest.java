package org.anuj.EvenTAura.dto;

import org.anuj.EvenTAura.model.enums.QuestionType;

import java.util.List;

public interface QuestionRequest {

    String getTitle();

    String getDescription();

    String getPlaceholder();

    QuestionType getQuestionType();

    boolean isRequired();

    Integer getDisplayOrder();

    Integer getMinLength();

    Integer getMaxLength();

    Integer getMinValue();

    Integer getMaxValue();

    String getRegexPattern();

    List<String> getOptions();
}