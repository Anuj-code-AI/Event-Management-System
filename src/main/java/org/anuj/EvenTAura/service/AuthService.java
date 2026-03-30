package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.*;
import org.springframework.security.core.Authentication;

import java.util.Map;

public interface AuthService {
    Map<String,String> register(RegisterRequest req);
    Map<String,String> login(LoginRequest req);

    UserResponse me(Authentication auth);

    String deleteAccount(Authentication authentication);

    UserResponse updateProfile(UserRequest request, Authentication authentication);

    RoleResponse roleOfMe(Authentication authentication);

    Map<String, String> refresh(String refreshToken);
}
