package org.anuj.EvenTAura.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UniversityResponse {
    private Long universityId;
    private String name;
    private String domain;
    private String logoUrl;
}
