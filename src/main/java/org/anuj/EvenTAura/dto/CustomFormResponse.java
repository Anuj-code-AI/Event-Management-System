package org.anuj.EvenTAura.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.anuj.EvenTAura.model.enums.FormStatus;
import org.anuj.EvenTAura.model.enums.ParticipationType;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CustomFormResponse {

    private String id;

    private String title;

    private String description;

    private String createdBy;
    private LocalDateTime createdAt;

    private String bannerUrl;

    private String university;

    private ParticipationType participationType;

    private FormStatus status;

    private boolean acceptingResponses;

    private LocalDateTime registrationStart;

    private LocalDateTime registrationDeadline;

    private Integer maxSubmissions;

    private boolean allowMultipleSubmissions;

    private boolean paymentRequired;
    private String paymentQrUrl;
    private Double registrationFee;
    private String paymentInstruction;


    private List<QuestionResponse> questions;
}
