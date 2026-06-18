package org.anuj.EvenTAura.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.RequestRole;
import org.anuj.EvenTAura.dto.RoleResponse;
import org.anuj.EvenTAura.dto.UserResponse;
import org.anuj.EvenTAura.dto.UserUpdateRequest;
import org.anuj.EvenTAura.exception.AllExceptions.AccountIsDeactiveException;
import org.anuj.EvenTAura.exception.AllExceptions.UniversityNotSupportedException;
import org.anuj.EvenTAura.exception.AllExceptions.UserNotFoundException;
import org.anuj.EvenTAura.mapper.UserMapper;
import org.anuj.EvenTAura.model.HostApplication;
import org.anuj.EvenTAura.model.University;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.model.enums.HostStatus;
import org.anuj.EvenTAura.repository.HostApplicationRepository;
import org.anuj.EvenTAura.repository.UniversityRepository;
import org.anuj.EvenTAura.repository.UserRepository;
import org.anuj.EvenTAura.security.CustomUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService{

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final UniversityRepository universityRepository;
    private final HostApplicationRepository hostApplicationRepository;


    // GET USER SERVICE
    @Override
    public UserResponse getUser(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getId();
        User user = userRepository.findById(userId)
                .orElseThrow(()->new UserNotFoundException("User not found"));
        return UserMapper.toResponse(user);
    }

    // UPDATE USER SYSTEM-ROLE
    @Override
    @Transactional
    public UserResponse updateRole(Long userId, RequestRole role, Authentication authentication) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User with this id not found"));
        if(!user.getIsActive()){
            throw new UserNotFoundException("User account is inactive");
        }
        user.setSystemRole(role.getRole());
        return UserMapper.toResponse(user);
    }


    // UPDATE USER SERVICE
    @Override
    @Transactional
    public UserResponse updateUser(Authentication authentication, UserUpdateRequest request) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(()->new UserNotFoundException("User not found"));

        University university = user.getUniversity();
        if(request.getUniversity()!=null && !request.getUniversity().isBlank()){
            university = universityRepository.findByNameIgnoreCase(request.getUniversity())
                    .orElseThrow(() ->
                            new UniversityNotSupportedException(
                                    "We are not currently serving this university. You may register without selecting a university."
                            ));
        }
        if(request.getPassword()!=null && !request.getPassword().isBlank()){
            request.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        UserMapper.toUpdatedEntity(user, request, university);
        return UserMapper.toResponse(user);
    }

    // DELETE USER SERVICE
    @Override
    @Transactional
    public Void deleteUser(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Long userId = userDetails.getId();
        User user = userRepository.findById(userId)
                .orElseThrow(()->new UserNotFoundException("User not found"));
        if(!user.getIsActive()){
            throw new AccountIsDeactiveException("User account is already deactivate");
        }
        authService.revokeAllForUserId(userId);
        user.setIsActive(false);
        return null;
    }

    // GET USER BY ID SERVICE
    @Override
    public UserResponse getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(()->new UserNotFoundException("User not found"));
        return UserMapper.toResponse(user);
    }

    // GET USER ROLE
    @Override
    public RoleResponse roleOfMe(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        RoleResponse response = new RoleResponse();
        response.setName(user.getName());
        response.setSystemRole(user.getSystemRole());
        Optional<HostApplication> profile =
                hostApplicationRepository.findTopByUserOrderByAppliedAtDesc(user);

        HostStatus status = profile
                .map(HostApplication::getStatus)
                .orElse(HostStatus.NONE);
        response.setStatus(status);
        return response;
    }
}
