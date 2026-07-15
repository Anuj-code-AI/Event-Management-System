package org.anuj.EvenTAura.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class SubmitCustomFormRequest {

    private List<AnswerRequest> answers;
}
