package org.anuj.EvenTAura.controller;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.UniversityRequest;
import org.anuj.EvenTAura.dto.UniversityResponse;
import org.anuj.EvenTAura.payload.ApiResponse;
import org.anuj.EvenTAura.service.UniversityService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class UniversityController {

    private final UniversityService universityService;


    // Add University
    @PostMapping("/universities/create")
    public ResponseEntity<ApiResponse<UniversityResponse>> createUniversity(@RequestBody UniversityRequest request, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("University added successfully",universityService.addUniversity(request, authentication)));
    }

    // Update University
    @PostMapping("/universities/{id}/update")
    public ResponseEntity<ApiResponse<UniversityResponse>> updateUniversity(@PathVariable Long id, @RequestBody UniversityRequest request, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("University updated successfully",universityService.updateUniversity(id, request, authentication)));
    }

    // Get University by university-id
    @GetMapping("/universities/{id}")
    public ResponseEntity<ApiResponse<UniversityResponse>> getUniversityById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("University updated successfully",universityService.getUniversityById(id, authentication)));
    }

    // Get all registered university
    @GetMapping("/universities")
    public ResponseEntity<ApiResponse<Page<UniversityResponse>>> getUniversityById(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("University updated successfully",universityService.getAllUniversity(page, size, authentication)));
    }

    // Delete University
    @DeleteMapping("/universities/{id}/delete")
    public ResponseEntity<Void> deleteUniversity(@PathVariable Long id, Authentication authentication) {
        universityService.deleteUniversity(id, authentication);
        return ResponseEntity.noContent().build();
    }

}
