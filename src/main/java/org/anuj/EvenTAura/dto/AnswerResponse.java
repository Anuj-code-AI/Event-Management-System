package org.anuj.EvenTAura.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AnswerResponse {

    private Long questionId;

    private String questionTitle;

    private String answerValue;

    private String fileUrl;
}
