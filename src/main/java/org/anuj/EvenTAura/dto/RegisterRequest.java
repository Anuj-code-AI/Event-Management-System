package org.anuj.EvenTAura.dto;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;


import lombok.*;

@Data
public class RegisterRequest {

    @NotBlank(message = "Name cannot be empty")
    private String name;

    @Email(message = "Invalid email format")
    @NotBlank
    private String email;

    @NotBlank
    @Size(min = 4,message = "Password must be at least 4 characters")
    private String password;

    @NotBlank
    private String confirmPassword;

    private String university;
}
