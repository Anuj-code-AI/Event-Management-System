package org.anuj.EvenTAura.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CustomFormSubmissionResponse {

    private Long id;

    private String submissionCode;

    private Long submittedById;

    private String submittedBy;

    private String email;

    private LocalDateTime submittedAt;

    private List<AnswerResponse> answers;
}
