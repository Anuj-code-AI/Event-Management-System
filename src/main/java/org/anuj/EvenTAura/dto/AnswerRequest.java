package org.anuj.EvenTAura.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AnswerRequest {

    private Long questionId;

    private String answerValue;

    private String fileUrl;
}
