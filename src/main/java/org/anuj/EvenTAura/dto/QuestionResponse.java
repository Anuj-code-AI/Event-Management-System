package org.anuj.EvenTAura.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.anuj.EvenTAura.model.enums.QuestionType;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class QuestionResponse {

    private Long id;

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