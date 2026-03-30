package org.anuj.EvenTAura.service;

import org.anuj.EvenTAura.dto.EventSummaryResponse;
import org.anuj.EvenTAura.dto.HostRequest;
import org.anuj.EvenTAura.model.HostProfile;
import org.springframework.security.core.Authentication;

import java.util.List;

public interface HostService {
    public void applyForHost(Authentication auth, HostRequest request);
    public void approveHost(Long hostId,Authentication authentication);
    public void rejectHost(Long hostId,Authentication auth);
    public List<HostProfile> pendingHost(Authentication authentication);

    void approveEvent(Long eventId, Authentication authentication);

    void rejectEvent(Long eventId, Authentication authentication);

    List<EventSummaryResponse> pendingEvent(Authentication authentication);

    List<HostProfile> approvedHost(Authentication authentication);

    List<HostProfile> rejectedHost(Authentication authentication);

    List<EventSummaryResponse> approvedEvent(Authentication authentication);

    List<EventSummaryResponse> rejectedEvent(Authentication authentication);
}
