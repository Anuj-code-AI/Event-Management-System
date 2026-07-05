package org.anuj.EvenTAura.dto;


import lombok.Data;

@Data
public class VerifyOtpRequest {
    public String email;
    public String otp;
}
