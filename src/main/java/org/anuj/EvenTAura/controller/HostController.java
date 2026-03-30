package org.anuj.EvenTAura.controller;


import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.EventSummaryResponse;
import org.anuj.EvenTAura.dto.HostRequest;
import org.anuj.EvenTAura.model.HostProfile;
import org.anuj.EvenTAura.service.HostService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class HostController {

    private final HostService hostService;

    @PostMapping("/host/apply")
    public ResponseEntity<Void> applyForHost(@Valid @RequestBody HostRequest req, Authentication authentication){
        hostService.applyForHost(authentication,req);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/admin/host/{id}/approve")
    public ResponseEntity<Void> approveHost(@PathVariable("id") Long hostId,Authentication authentication){
        hostService.approveHost(hostId,authentication);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/admin/host/{id}/reject")
    public ResponseEntity<Void> rejectHost(@PathVariable("id") Long hostId,Authentication authentication){
        hostService.rejectHost(hostId,authentication);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/host/pending")
    public ResponseEntity<List<HostProfile>> pendingHost(Authentication authentication){
        return ResponseEntity.ok(hostService.pendingHost(authentication));
    }

    @GetMapping("/admin/host/approved")
    public ResponseEntity<List<HostProfile>> appreovedHost(Authentication authentication){
        return ResponseEntity.ok(hostService.approvedHost(authentication));
    }

    @GetMapping("/admin/host/rejected")
    public ResponseEntity<List<HostProfile>> rejectedHost(Authentication authentication){
        return ResponseEntity.ok(hostService.rejectedHost(authentication));
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
    public ResponseEntity<List<EventSummaryResponse>> pendingEvent(Authentication authentication){
        return ResponseEntity.ok(hostService.pendingEvent(authentication));
    }

    @GetMapping("/admin/event/approved")
    public ResponseEntity<List<EventSummaryResponse>> approvedEvent(Authentication authentication){
        return ResponseEntity.ok(hostService.approvedEvent(authentication));
    }

    @GetMapping("/admin/event/rejected")
    public ResponseEntity<List<EventSummaryResponse>> rejectedEvent(Authentication authentication){
        return ResponseEntity.ok(hostService.rejectedEvent(authentication));
    }


}
