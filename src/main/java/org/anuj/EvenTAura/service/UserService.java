package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.RequestRole;
import org.anuj.EvenTAura.dto.RoleResponse;
import org.anuj.EvenTAura.dto.UserResponse;
import org.anuj.EvenTAura.dto.UserUpdateRequest;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;

public interface UserService {
    UserResponse getUser(Authentication authentication);
    UserResponse updateRole(Long userId, RequestRole role, Authentication authentication);
    UserResponse updateUser(Authentication authentication, UserUpdateRequest request);
    Void deleteUser(Authentication authentication);
    UserResponse getUserById(Long userId);
    RoleResponse roleOfMe(Authentication authentication);

    Page<UserResponse> getAllUser(String query, int page, int size);
}
