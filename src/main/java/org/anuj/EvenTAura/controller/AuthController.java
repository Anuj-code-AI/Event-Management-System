package org.anuj.EvenTAura.controller;


import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.LoginRequest;
import org.anuj.EvenTAura.dto.RegisterRequest;
import org.anuj.EvenTAura.dto.UserRequest;
import org.anuj.EvenTAura.dto.UserResponse;
import org.anuj.EvenTAura.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;


@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req){
        if(!req.getPassword().equals(req.getConfirmPassword())){
            throw new RuntimeException("Passwords do not match");
        }
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req){
        return ResponseEntity.ok(authService.login(req));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Authentication auth){
        return ResponseEntity.ok(authService.me(auth));
    }

    @DeleteMapping("/deleteAccount")
    public ResponseEntity<?> deleteAccount(Authentication authentication){
        return ResponseEntity.ok(authService.deleteAccount(authentication));
    }

    @PatchMapping("/update/me")
    public ResponseEntity<UserResponse> updateProfile(@RequestBody UserRequest request, Authentication authentication){
        return ResponseEntity.ok(authService.updateProfile(request,authentication));
    }
}
