package org.anuj.EvenTAura.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.anuj.EvenTAura.model.enums.SystemRole;
import org.anuj.EvenTAura.model.enums.HostStatus;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponse {
    private String name;
    private SystemRole systemRole;
    private HostStatus status;
}

