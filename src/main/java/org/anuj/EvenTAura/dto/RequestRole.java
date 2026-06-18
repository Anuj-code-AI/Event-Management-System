package org.anuj.EvenTAura.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.anuj.EvenTAura.model.enums.SystemRole;

@Data
public class RequestRole {

    @NotBlank(message = "Role can't be blank")
    private SystemRole role;
}
