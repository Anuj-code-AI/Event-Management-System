package org.anuj.EvenTAura.security;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.model.enums.HostStatus;
import org.anuj.EvenTAura.repository.HostApplicationRepository;
import org.anuj.EvenTAura.repository.UserRepository;
import org.anuj.EvenTAura.util.JwtUtil;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component("eventSecurity")
@RequiredArgsConstructor
public class EventSecurity {

    private final HostApplicationRepository hostProfileRepository;

    // Pre-checks that only admin or person with host-profile can host event
    public boolean isHostOrHOD(Authentication authentication) {

        boolean isHOD = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_HOD"));
        if (isHOD) {
            return true;
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return hostProfileRepository.existsByUser_UserIdAndStatus(
                userDetails.getId(),
                HostStatus.APPROVED
        );
    }

}
