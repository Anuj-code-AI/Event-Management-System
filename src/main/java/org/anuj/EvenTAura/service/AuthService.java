package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.LoginRequest;
import org.anuj.EvenTAura.dto.RegisterRequest;
import org.anuj.EvenTAura.dto.UserRequest;
import org.anuj.EvenTAura.dto.UserResponse;
import org.springframework.security.core.Authentication;

import java.util.Map;

public interface AuthService {
    Map<String,String> register(RegisterRequest req);
    Map<String,String> login(LoginRequest req);

    UserResponse me(Authentication auth);

    String deleteAccount(Authentication authentication);

    UserResponse updateProfile(UserRequest request, Authentication authentication);
}
