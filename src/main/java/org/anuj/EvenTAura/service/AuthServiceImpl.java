package org.anuj.EvenTAura.service;


import jakarta.transaction.Transactional;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.*;
import org.anuj.EvenTAura.exception.InvalidPasswordException;
import org.anuj.EvenTAura.exception.UserAlreadyExistException;
import org.anuj.EvenTAura.exception.UserNotFoundException;
import org.anuj.EvenTAura.mapper.UserMapper;
import org.anuj.EvenTAura.model.*;
import org.anuj.EvenTAura.repository.EventRepository;
import org.anuj.EvenTAura.repository.HostProfileRepository;
import org.anuj.EvenTAura.repository.RefreshRepository;
import org.anuj.EvenTAura.repository.UserRepository;
import org.anuj.EvenTAura.util.JwtUtil;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService{

    private final JwtUtil jwtUtil;
    private final UserMapper userMapper;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EventRepository eventRepository;
    private final RefreshRepository refreshRepository;
    private final HostProfileRepository hostProfileRepository;


    @Override
    @Transactional
    public Map<String, String> register(RegisterRequest req) {
        if(userRepository.findByEmail(req.getEmail()).isPresent()){
            throw new UserAlreadyExistException("User already Exception");
        }
        User user = new User();
        user.setName(req.getName());
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setRole(Role.ROLE_USER);
        userRepository.save(user);
        String access = jwtUtil.generateAccessToken(user.getEmail(),user.getRole());
        String refresh = jwtUtil.generateRefreshToken(user.getEmail());
        RefreshToken newToken = new RefreshToken();
        newToken.setUser(user);
        newToken.setToken(refresh);
        newToken.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshRepository.save(newToken);
        return Map.of(
                "refreshToken",refresh,
                "accessToken",access
        );
    }

    @Override
    public Map<String, String> login(LoginRequest req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(()->new UserNotFoundException("User not exist! Register now...."));
        if(!passwordEncoder.matches(req.getPassword(), user.getPassword())){
            throw new InvalidPasswordException("Incorrect Password");
        }
        String access = jwtUtil.generateAccessToken(user.getEmail(), user.getRole());
        String refresh = jwtUtil.generateRefreshToken(user.getEmail());
        RefreshToken newToken = new RefreshToken();
        newToken.setToken(refresh);
        newToken.setUser(user);
        newToken.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshRepository.save(newToken);
        return Map.of(
                "refreshToken",refresh,
                "accessToken",access
        );
    }

    @Override
    public UserResponse me(Authentication authentication) {
        return userMapper.toResponse(userRepository.findByEmail(authentication.getName())
                .orElseThrow(()->new UserNotFoundException("User not found")));
    }

    @Override
    @Transactional
    public String deleteAccount(@NonNull Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(()->new UserNotFoundException("User not found"));
        refreshRepository.deleteByUser(user);
        eventRepository.deleteByUser(user);

        userRepository.delete(user);
        return "User deleted successfully";
    }


    @Override
    @Transactional
    public UserResponse updateProfile(UserRequest request, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        userMapper.updateUserfromRequest(request, user);

        User saved = userRepository.save(user);
        return userMapper.toResponse(saved);
    }

    @Override
    public RoleResponse roleOfMe(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        RoleResponse response = new RoleResponse();
        response.setName(user.getName());
        response.setRole(user.getRole());
        Optional<HostProfile> profile =
                hostProfileRepository.findTopByUserOrderByAppliedAtDesc(user);

        Status status = profile
                .map(HostProfile::getStatus)
                .orElse(Status.NONE);
        response.setStatus(status);
        return response;
    }

    @Override
    public Map<String, String> refresh(String refreshToken) {
        // Validate the refresh token exists in DB and is not expired
        RefreshToken stored = refreshRepository.findByToken(refreshToken)
                .orElseThrow(() -> new RuntimeException("Invalid refresh token"));

        if (stored.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshRepository.delete(stored);
            throw new RuntimeException("Refresh token expired, please login again");
        }

        User user = stored.getUser();
        String newAccessToken  = jwtUtil.generateAccessToken(user.getEmail(), user.getRole());
        String newRefreshToken = jwtUtil.generateRefreshToken(user.getEmail());

        // Rotate the refresh token
        stored.setToken(newRefreshToken);
        stored.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshRepository.save(stored);

        return Map.of(
                "accessToken",  newAccessToken,
                "refreshToken", newRefreshToken
        );
    }

}
