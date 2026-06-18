package org.anuj.EvenTAura.dto;

import lombok.Data;

@Data
public class UserUpdateRequest {
    private String name;
    private String password;
    private String university;
}

