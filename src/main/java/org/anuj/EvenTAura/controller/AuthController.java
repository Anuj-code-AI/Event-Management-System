package org.anuj.EvenTAura.controller;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.*;
import org.anuj.EvenTAura.service.AuthService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@Tag(name = "Authentication APIs", description = "Operations related to authentication")
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    // REGISTER USER
    @Operation(summary = "Register user", description = "Register a new user with user details like:- name, email, password, university(Optional)")
    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest req,
            HttpServletResponse response
    ){
        if(!req.getPassword().equals(req.getConfirmPassword())){
            throw new RuntimeException("Passwords do not match");
        }
        TokenPair pair = authService.register(req);
        setRefreshCookie(response, pair.getRefreshToken());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("accessToken",pair.getAccessToken()));
    }

    // LOGIN USER
    @Operation(summary = "Login user", description = "Login existing user with user details like:- name, password")
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest req,
            HttpServletResponse response
    ){
        TokenPair pair = authService.login(req);
        setRefreshCookie(response, pair.getRefreshToken());
        return ResponseEntity.ok(Map.of("accessToken",pair.getAccessToken()));
    }

    // REFRESH TOKEN
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@CookieValue("refreshToken") String refreshToken) {
        return ResponseEntity.ok(authService.refresh(refreshToken));
    }

    // LOGOUT
    @Operation(summary = "Logout Usee", description = "Logout user doesn't inactive account just revoke access and refresh token")
    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            HttpServletResponse response
    ) {
        if(refreshToken!=null)
            authService.revoke(refreshToken);
        clearRefreshCookie(response);
        return ResponseEntity.ok(Map.of("message","Logged out"));
    }

    // ── cookie helpers ────────────────────────────────────────
    private void setRefreshCookie(HttpServletResponse res,String token) {
        ResponseCookie c = ResponseCookie.from("refreshToken",token)
                .httpOnly(true)
                .secure(false)               // send only over HTTPS
                .sameSite("Strict")          // CSRF protection
                .path("/api/v1/auth/refresh")    // cookie NOT sent to /api/* endpoints
                .maxAge(Duration.ofDays(7))
                .build();
        res.addHeader(HttpHeaders.SET_COOKIE,c.toString());
    }

    private void clearRefreshCookie(HttpServletResponse res) {
        ResponseCookie c = ResponseCookie.from("refreshToken","")
                .httpOnly(true)
                .secure(true)               // send only over HTTPS
                .sameSite("Strict")          // CSRF protection
                .path("/api/v1/auth/refresh")    // cookie NOT sent to /api/* endpoints
                .maxAge(0)
                .build();
        res.addHeader(HttpHeaders.SET_COOKIE,c.toString());
    }
}
