package org.anuj.EvenTAura.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.anuj.EvenTAura.model.Role;
import org.anuj.EvenTAura.model.Status;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponse {
    private String name;
    private Role role;
    private Status status;
}

