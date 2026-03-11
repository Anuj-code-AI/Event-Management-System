package org.anuj.EvenTAura.service;


import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.LoginRequest;
import org.anuj.EvenTAura.dto.RegisterRequest;
import org.anuj.EvenTAura.dto.UserResponse;
import org.anuj.EvenTAura.exception.InvalidPasswordException;
import org.anuj.EvenTAura.exception.UserAlreadyExistException;
import org.anuj.EvenTAura.exception.UserNotFoundException;
import org.anuj.EvenTAura.mapper.UserMapper;
import org.anuj.EvenTAura.model.RefreshToken;
import org.anuj.EvenTAura.model.Role;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.repository.EventRepository;
import org.anuj.EvenTAura.repository.RefreshRepository;
import org.anuj.EvenTAura.repository.UserRepository;
import org.anuj.EvenTAura.util.JwtUtil;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService{

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EventRepository eventRepository;
    private final RefreshRepository refreshRepository;


    @Override
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
                .orElseThrow(()->new UserNotFoundException("User not found"));
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
    public UserResponse me(Authentication auth) {
        return UserMapper.toResponse(userRepository.findByEmail(auth.getName())
                .orElseThrow(()->new UserNotFoundException("User not found")));
    }

    @Override
    @Transactional
    public String deleteAccount(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(()->new UserNotFoundException("User not found"));
        refreshRepository.deleteByUser(user);
        eventRepository.deleteByUser(user);

        userRepository.delete(user);
        return "User deleted successfully";
    }

}
