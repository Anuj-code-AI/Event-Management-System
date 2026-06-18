package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.EventSummaryResponse;
import org.anuj.EvenTAura.dto.HostRequest;
import org.anuj.EvenTAura.model.HostApplication;
import org.springframework.security.core.Authentication;

import java.util.List;

public interface HostService {
    void applyForHost( HostRequest request, Authentication auth);
    void approveHost(Long hostId, Authentication authentication);
    void rejectHost(Long hostId, Authentication auth);
    List<HostApplication> pendingHost(Authentication authentication);
    void approveEvent(Long eventId, Authentication authentication);
    void rejectEvent(Long eventId, Authentication authentication);

    List<EventSummaryResponse> pendingEvent(Authentication authentication);
    List<HostApplication> approvedHost(Authentication authentication);
    List<HostApplication> rejectedHost(Authentication authentication);
    List<EventSummaryResponse> approvedEvent(Authentication authentication);
    List<EventSummaryResponse> rejectedEvent(Authentication authentication);
}
