package org.anuj.EvenTAura.dto;

import lombok.Getter;
import lombok.Setter;
import org.anuj.EvenTAura.model.enums.QuestionType;

import java.util.List;

@Getter
@Setter
public class CreateQuestionRequest implements QuestionRequest{

    private String title;

    private String description;

    private String placeholder;

    private QuestionType questionType;

    private boolean required;

    private Integer displayOrder;

    private Integer minLength;

    private Integer maxLength;

    private Integer minValue;

    private Integer maxValue;

    private String regexPattern;

    private List<String> options;
}
