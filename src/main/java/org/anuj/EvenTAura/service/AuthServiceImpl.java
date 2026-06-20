package org.anuj.EvenTAura.service;


import io.jsonwebtoken.Claims;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.*;
import org.anuj.EvenTAura.exception.AllExceptions.*;
import org.anuj.EvenTAura.mapper.UserMapper;
import org.anuj.EvenTAura.model.*;
import org.anuj.EvenTAura.repository.*;
import org.anuj.EvenTAura.util.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService{

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshRepository;
    private final UniversityRepository universityRepository;



    @Override
    @Transactional
    public TokenPair register(RegisterRequest request) {
        if(userRepository.findByEmail(request.getEmail()).isPresent()){
            throw new EmailAlreadyExistException("User with this email already registered");
        }
        University university =  null;
        if(request.getUniversity()!=null && !request.getUniversity().isBlank()){
            university = universityRepository.findByNameContainingIgnoreCase(request.getUniversity())
                    .orElseThrow(() ->
                            new UniversityNotSupportedException(
                                    "We are not currently serving this university. You may register without selecting a university."
                            ));
            if (university.getDomain() != null) {
                String email = request.getEmail();
                String emailDomain = email.substring(email.lastIndexOf("@") + 1);
                if (!emailDomain.equalsIgnoreCase(university.getDomain())) {
                    throw new RuntimeException("Your email domain (" + emailDomain + ") does not match the university domain (" + university.getDomain() + ").");
                }
            }
        }
        request.setPassword(passwordEncoder.encode(request.getPassword()));
        User user = UserMapper.toEntity(request, university);
        userRepository.save(user);
        return issueTokenPair(user);
    }

    // LOGIN SERVICE
    @Override
    public TokenPair login(LoginRequest req){
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(()-> new UserNotFoundException("No account with this email"));
        if(!passwordEncoder.matches(req.getPassword(), user.getPassword()))
            throw new InvalidPasswordException("Incorrect password");
        if(!user.getIsActive()){
            throw new AccountIsDeactiveException("User account is deactivated");
        }
        return issueTokenPair(user);
    }


    // REFRESH SERVICE
    @Override
    @Transactional
    public TokenPair refresh(String rawToken) {
        Claims claims = jwtUtil.extractAllClaims(rawToken);
        if (claims == null) {
            throw new TokenExpiredException("Invalid refresh token");
        }
        RefreshToken stored = refreshRepository.findByToken(rawToken)
                .orElseThrow(()->{
                    // Token not in DB: it was already rotated.
                    // Could be replay attack — revoke all sessions for this user.
                    Long userId = jwtUtil.extractUserId(rawToken);
                    if (userId != null) {
                        revokeAllForUserId(userId);
                    }
                    return new TokenReusedException("Token reuse detected — all sessions revoked");
                });

        if(stored.getExpiryDate().isBefore(LocalDateTime.now())){
            refreshRepository.delete(stored);
            throw new TokenExpiredException("Refresh token expired, please login again");
        }

        User user = stored.getUser();
        String newAccess  = jwtUtil.generateAccessToken(user.getUserId(), user.getEmail(),user.getSystemRole());
        String newRefresh = jwtUtil.generateRefreshToken(user.getUserId());

        // Rotate in the same DB row (no extra insert)
        stored.setToken(newRefresh);
        stored.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshRepository.save(stored);

        return new TokenPair(newAccess, newRefresh);

    }


    // REVOKE USER TOKEN SERVICE
    @Override
    @Transactional
    public void revoke(String rawToken) {
        refreshRepository.findByToken(rawToken)
                .ifPresent(refreshRepository::delete);
    }

    // ── private helpers ──────────────────────────────────────────

    private TokenPair issueTokenPair(User user) {
        String access = jwtUtil.generateAccessToken(user.getUserId(), user.getEmail(), user.getSystemRole());
        String refresh = jwtUtil.generateRefreshToken(user.getUserId());

        RefreshToken token = new RefreshToken();
        token.setToken(refresh);
        token.setUser(user);
        token.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshRepository.save(token);

        return new TokenPair(access,refresh);
    }


    public void revokeAllForUserId(Long userId) {
        if (userId == null) return;
        userRepository.findById(userId)
                .ifPresent(refreshRepository::deleteAllByUser);
    }
}
