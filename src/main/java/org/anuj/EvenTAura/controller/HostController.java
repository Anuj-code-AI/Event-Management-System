package org.anuj.EvenTAura.controller;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.EventSummaryResponse;
import org.anuj.EvenTAura.model.HostApplication;
import org.anuj.EvenTAura.payload.ApiResponse;
import org.anuj.EvenTAura.service.HostService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
@PreAuthorize("hasRole('HOD') or hasRole('SUPRE_ADMIN')")
public class HostController {

    private final HostService hostService;


    @PatchMapping("/admin/host/{id}/approve")
    public ResponseEntity<Void> approveHost(@PathVariable("id") Long hostId,Authentication authentication){
        hostService.approveHost(hostId, authentication);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/admin/host/{id}/reject")
    public ResponseEntity<Void> rejectHost(@PathVariable("id") Long hostId,Authentication authentication){
        hostService.rejectHost(hostId, authentication);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/host/pending")
    public ResponseEntity<ApiResponse<List<HostApplication>>> pendingHost(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Pending list loaded successfully", hostService.pendingHost(authentication)));
    }

    @GetMapping("/admin/host/approved")
    public ResponseEntity<ApiResponse<List<HostApplication>>> approvedHost(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Approved list loaded successfully", hostService.approvedHost(authentication)));
    }

    @GetMapping("/admin/host/rejected")
    public ResponseEntity<ApiResponse<List<HostApplication>>> rejectedHost(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Rejected profile loaded successfully", hostService.rejectedHost(authentication)));
    }

    @PatchMapping("/admin/event/{id}/approve")
    public ResponseEntity<Void> approveEvent(@PathVariable("id") Long eventId,Authentication authentication){
        hostService.approveEvent(eventId,authentication);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/admin/event/{id}/reject")
    public ResponseEntity<Void> rejectEvent(@PathVariable("id") Long eventId,Authentication authentication){
        hostService.rejectEvent(eventId,authentication);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/event/pending")
    public ResponseEntity<ApiResponse<List<EventSummaryResponse>>> pendingEvent(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Pending list loaded successfully", hostService.pendingEvent(authentication)));
    }

    @GetMapping("/admin/event/approved")
    public ResponseEntity<ApiResponse<List<EventSummaryResponse>>> approvedEvent(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Approved event list loaded successfully", hostService.approvedEvent(authentication)));
    }

    @GetMapping("/admin/event/rejected")
    public ResponseEntity<ApiResponse<List<EventSummaryResponse>>> rejectedEvent(Authentication authentication){
        return ResponseEntity.ok(ApiResponse.success("Rejected event list loaded successfully", hostService.rejectedEvent(authentication)));
    }

}
