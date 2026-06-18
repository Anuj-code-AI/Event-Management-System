package org.anuj.EvenTAura.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UniversityRequest {

    @NotBlank(message = "University name can't be null")
    private String name;

    @NotBlank(message = "College domain required")
    private String domain;

    private String logoUrl;

}
