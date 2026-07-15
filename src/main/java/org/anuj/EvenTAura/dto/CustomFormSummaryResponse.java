package org.anuj.EvenTAura.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.anuj.EvenTAura.model.enums.FormStatus;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CustomFormSummaryResponse {
    private Long id;
    private String title;
    private String bannerUrl;
    private LocalDateTime registrationDeadLine;
    private FormStatus status;
    private String logoUrl;
}
