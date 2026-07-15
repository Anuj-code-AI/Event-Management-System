package org.anuj.EvenTAura.controller;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.CustomFormSummaryResponse;
import org.anuj.EvenTAura.dto.EventSummaryResponse;
import org.anuj.EvenTAura.model.HostApplication;
import org.anuj.EvenTAura.model.enums.FormSortBy;
import org.anuj.EvenTAura.model.enums.FormStatus;
import org.anuj.EvenTAura.model.enums.SortDirection;
import org.anuj.EvenTAura.payload.ApiResponse;
import org.anuj.EvenTAura.service.CustomFormService;
import org.anuj.EvenTAura.service.HostService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('HOD')")
public class HostController {

    private final HostService hostService;
    private final CustomFormService customFormService;

    @PatchMapping("/host/{id}/approve")
    public ResponseEntity<Void> approveHost(@PathVariable("id") Long hostId,Authentication authentication){
        hostService.approveHost(hostId, authentication);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/host/{id}/reject")
    public ResponseEntity<Void> rejectHost(@PathVariable("id") Long hostId,Authentication authentication){
        hostService.rejectHost(hostId, authentication);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/host/pending")
    public ResponseEntity<ApiResponse<List<HostApplication>>> pendingHost(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Pending list loaded successfully", hostService.pendingHost(authentication)));
    }

    @GetMapping("/host/approved")
    public ResponseEntity<ApiResponse<List<HostApplication>>> approvedHost(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Approved list loaded successfully", hostService.approvedHost(authentication)));
    }

    @GetMapping("/host/rejected")
    public ResponseEntity<ApiResponse<List<HostApplication>>> rejectedHost(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Rejected profile loaded successfully", hostService.rejectedHost(authentication)));
    }

    @PatchMapping("/events/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveEvent(@PathVariable("id") Long eventId,Authentication authentication){
        hostService.approveEvent(eventId,authentication);
        return ResponseEntity.ok(ApiResponse.success("Form approved successfully", null));
    }

    @PatchMapping("/events/{id}/reject")
    public ResponseEntity<Void> rejectEvent(@PathVariable("id") Long eventId,Authentication authentication){
        hostService.rejectEvent(eventId,authentication);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/events/pending")
    public ResponseEntity<ApiResponse<List<EventSummaryResponse>>> pendingEvent(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Pending list loaded successfully", hostService.pendingEvent(authentication)));
    }

    @GetMapping("/events/approved")
    public ResponseEntity<ApiResponse<List<EventSummaryResponse>>> approvedEvent(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Approved event list loaded successfully", hostService.approvedEvent(authentication)));
    }

    @GetMapping("/events/rejected")
    public ResponseEntity<ApiResponse<List<EventSummaryResponse>>> rejectedEvent(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Rejected event list loaded successfully", hostService.rejectedEvent(authentication)));
    }

    // HOD Approves Form
    @PostMapping("/custom-forms/{formId}/approve")
    public ResponseEntity<ApiResponse<Void>> approveForm(@PathVariable Long formId, Authentication authentication) {
        customFormService.approveForm(formId, authentication);
        return ResponseEntity.ok(ApiResponse.success("Form approved successfully", null));
    }

    // HOD Rejects Form
    @PostMapping("/custom-forms/{formId}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectForm(@PathVariable Long formId, Authentication authentication) {
        customFormService.rejectForm(formId, authentication);
        return ResponseEntity.ok(ApiResponse.success("Form rejected successfully", null));
    }

    // Retrieve forms pending review in university for HODs
    @GetMapping("/custom-forms")
    public ResponseEntity<ApiResponse<Page<CustomFormSummaryResponse>>> getFormsByStatus(
            @RequestParam FormStatus status,
            @RequestParam(required = false) String query,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "CREATED_AT") FormSortBy sortBy,
            @RequestParam(defaultValue = "desc") SortDirection direction,
            Authentication authentication
    ) {
        return ResponseEntity.ok(ApiResponse.success("Pending custom forms retrieved successfully", customFormService.getFormsByStatus(status, query, page, size, sortBy, direction, authentication)));
    }


}
