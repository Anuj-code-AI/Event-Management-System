package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.security.core.Authentication;

import java.util.List;

public interface UserService {
    UserResponse getUser(Authentication authentication);
    UserResponse updateRole(Long userId, RequestRole role, Authentication authentication);
    UserResponse updateUser(Authentication authentication, UserUpdateRequest request);
    Void deleteUser(Authentication authentication);
    UserResponse getUserById(Long userId);
    RoleResponse roleOfMe(Authentication authentication);
    Page<UserResponse> getAllUser(String query, int page, int size);
    List<UniversityListResponse> getAllUniversityList();
}

