package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.*;

public interface AuthService {
    TokenPair register(RegisterRequest req);
    TokenPair login(LoginRequest req);
    TokenPair refresh(String refreshToken);
    void revoke(String refreshToken);
    void revokeAllForUserId(Long userId);
}
