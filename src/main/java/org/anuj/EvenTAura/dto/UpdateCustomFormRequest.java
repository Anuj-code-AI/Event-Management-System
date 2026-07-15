package org.anuj.EvenTAura.dto;

import lombok.Getter;
import lombok.Setter;
import org.anuj.EvenTAura.model.enums.ParticipationType;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class UpdateCustomFormRequest {

    private String title;

    private String description;

    private String bannerUrl;

    private ParticipationType participationType;

    private LocalDateTime registrationStart;

    private LocalDateTime registrationDeadline;

    private Integer maxSubmissions;

    private boolean acceptingResponses;
    private String paymentQrUrl;
    private Double registrationFee;
    private String paymentInstructions;
    private boolean paymentRequired;

    private boolean allowMultipleSubmissions;

    private List<UpdateQuestionRequest> questions;
}
