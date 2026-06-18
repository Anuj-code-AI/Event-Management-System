package org.anuj.EvenTAura.controller;


import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.RequestRole;
import org.anuj.EvenTAura.dto.UniversityRequest;
import org.anuj.EvenTAura.dto.UniversityResponse;
import org.anuj.EvenTAura.dto.UserResponse;
import org.anuj.EvenTAura.payload.ApiResponse;
import org.anuj.EvenTAura.service.CloudinaryService;
import org.anuj.EvenTAura.service.UniversityService;
import org.anuj.EvenTAura.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminController {

    private final CloudinaryService cloudinaryService;
    private final UniversityService universityService;
    private final UserService userService;

    // Add University
    @PostMapping("/university")
    public ResponseEntity<ApiResponse<UniversityResponse>> addUniversity(
            @ModelAttribute UniversityRequest request,
            @RequestParam(value = "logo", required = false) MultipartFile logo,
            Authentication authentication
    ) {
        String logoUrl = null;
        if(logo != null && !logo.isEmpty()){
            logoUrl = cloudinaryService.uploadImage(logo, "logo");
        }
        request.setLogoUrl(logoUrl);
        return ResponseEntity.ok(ApiResponse.success(
                "University added successfully",
                universityService.addUniversity(request,authentication)
        ));
    }

    // Update University
    @PatchMapping("/university/{id}")
    public ResponseEntity<ApiResponse<UniversityResponse>> updateUniversity(
            @PathVariable Long id,
            @RequestBody UniversityRequest request,
            Authentication authentication
    ){
        return ResponseEntity.ok(
                ApiResponse.success(
                        "University updated successfully",
                        universityService.updateUniversity(id, request, authentication)
                )
        );
    }

    // Delete University
    @DeleteMapping("/university/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUniversity(
            @PathVariable Long id,
            Authentication authentication
    ){
        return ResponseEntity.ok(
                ApiResponse.success(
                        "University deleted successfully",
                        universityService.deleteUniversity(id, authentication)
                )
        );
    }

    // Get University by id
    @GetMapping("/university/{id}")
    public ResponseEntity<ApiResponse<UniversityResponse>> getUniversityById(
            @PathVariable Long id,
            Authentication authentication
    ){
        return ResponseEntity.ok(
                ApiResponse.success(
                        "University found",
                        universityService.getUniversityById(id, authentication)
                )
        );
    }

    // Get all universities
    @GetMapping("/university")
    public ResponseEntity<ApiResponse<Page<UniversityResponse>>> getAllUniversity(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication
    ){
        return ResponseEntity.ok(
                ApiResponse.success(
                        "Page loaded successfully",
                        universityService.getAllUniversity(page, size, authentication)
                )
        );
    }

    // Make hod
    @PatchMapping("/hod/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> makeUserHod(
            @PathVariable Long userId,
            @Valid @RequestBody RequestRole role,
            Authentication authentication
    ){
        return ResponseEntity.ok(
                ApiResponse.success(
                        "User role upgraded to hod",
                        userService.updateRole(userId, role, authentication)
                )
        );
    }

}
