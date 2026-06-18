package org.anuj.EvenTAura.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.HostRequest;
import org.anuj.EvenTAura.dto.RoleResponse;
import org.anuj.EvenTAura.dto.UserResponse;
import org.anuj.EvenTAura.dto.UserUpdateRequest;
import org.anuj.EvenTAura.payload.ApiResponse;
import org.anuj.EvenTAura.service.HostService;
import org.anuj.EvenTAura.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;


@Tag(name = "User APIs", description = "Operations related to user")
@RequiredArgsConstructor
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final HostService hostService;

    // GET USER DETAILS
    @Operation(summary = "Get user", description = "Use to get user details")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getUser(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Success",userService.getUser(authentication)));
    }

    // UPDATE USER DETAILS
    @Operation(summary = "Update user", description = "Update user details")
    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(Authentication authentication, @RequestBody UserUpdateRequest request){
        return ResponseEntity.ok(ApiResponse.success("Updated Successfully",userService.updateUser(authentication, request)));
    }

    // DELETE USER
    @Operation(summary = "Delete user", description = "Makes the user Inactive")
    @DeleteMapping("/me")
    public ResponseEntity<ApiResponse<Void>> deleteUser(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("User deleted Successfully",userService.deleteUser(authentication)));
    }

    // GET USER BY USER-ID
    @Operation(summary = "Get user by id", description = "Get user by user-id")
    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.success("User found",userService.getUserById(userId)));
    }

    // GIVES USER ROLE
    @GetMapping("/roleOfMe")
    public ResponseEntity<ApiResponse<RoleResponse>> roleOfMe(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Role loaded successfully", userService.roleOfMe(authentication)));
    }

    // APPLY TO BECOME A HOST
    @PostMapping("/host/apply")
    public ResponseEntity<ApiResponse<Void>> applyForHost(@Valid @RequestBody HostRequest req, Authentication authentication){
        hostService.applyForHost(req, authentication);
        return ResponseEntity.ok(ApiResponse.success(
                "Applied successfully",
                null
        ));
    }
}
