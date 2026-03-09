package org.anuj.EvenTAura.dto;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class LoginRequest {

    @Email(message = "Invalid email format")
    private String email;

    @Size(min=4,message = "Password must be atleast 4 characters")
    private String password;
}
