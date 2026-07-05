package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.*;

public interface AuthService {
    void register(RegisterRequest req);
    void resendOtp(String email);
    TokenPair verifyOtp(VerifyOtpRequest request);
    TokenPair login(LoginRequest req);
    TokenPair refresh(String refreshToken);
    void revoke(String refreshToken);
    void revokeAllForUserId(Long userId);
}
