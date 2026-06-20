package org.anuj.EvenTAura.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.anuj.EvenTAura.model.enums.SystemRole;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RequestRole {
    private SystemRole role;
}
