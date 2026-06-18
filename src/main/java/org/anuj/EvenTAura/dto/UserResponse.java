package org.anuj.EvenTAura.dto;

import lombok.AllArgsConstructor;

import lombok.*;
import org.anuj.EvenTAura.model.enums.AuthProvider;
import org.anuj.EvenTAura.model.enums.SystemRole;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long userId;
    private String name;
    private String email;
    private SystemRole systemRole;
    private String university;
    private AuthProvider provider;
}
