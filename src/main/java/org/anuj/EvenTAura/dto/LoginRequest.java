package org.anuj.EvenTAura.dto;


import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import lombok.*;

@Schema(description = "Login request")
@Data
public class LoginRequest {

    @Schema(description = "Email of user", example = "abc@gmail.com")
    @Email @NotBlank
    private String email;

    @Schema(description = "User password (min 8 characters)", example = "********")
    @NotBlank
    @Size(min = 4, message = "Password must be at least 8 characters")
    private String password;
}
