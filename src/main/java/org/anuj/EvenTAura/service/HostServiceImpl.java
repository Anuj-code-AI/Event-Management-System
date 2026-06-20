package org.anuj.EvenTAura.service;


import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.EventSummaryResponse;
import org.anuj.EvenTAura.dto.HostRequest;
import org.anuj.EvenTAura.exception.AllExceptions.AccessDeniedException;
import org.anuj.EvenTAura.exception.AllExceptions.EventNotExistException;
import org.anuj.EvenTAura.exception.AllExceptions.UserNotFoundException;
import org.anuj.EvenTAura.model.*;
import org.anuj.EvenTAura.model.enums.EventStatus;
import org.anuj.EvenTAura.model.enums.SystemRole;
import org.anuj.EvenTAura.model.enums.HostStatus;
import org.anuj.EvenTAura.repository.EventRepository;
import org.anuj.EvenTAura.repository.HostApplicationRepository;
import org.anuj.EvenTAura.repository.UserRepository;
import org.anuj.EvenTAura.security.CustomUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HostServiceImpl implements HostService{
    private final HostApplicationRepository hostApplicationRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;

    @Override
    @Transactional
    public void applyForHost(HostRequest request, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User user = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (hostApplicationRepository.existsByUserAndStatus(user, HostStatus.PENDING)) {
            throw new RuntimeException("Application already pending");
        }
        if (hostApplicationRepository.existsByUserAndStatus(user, HostStatus.APPROVED)) {
            throw new RuntimeException("Already a host");
        }
        if (user.getUniversity() == null) {
            throw new RuntimeException("Please select your university in your profile before applying to become a host.");
        }
        String[] domain = request.getCollegeEmail().split("@");
        if (domain.length < 2 || !domain[1].equalsIgnoreCase(user.getUniversity().getDomain())) {
            throw new RuntimeException("College email domain must match your university domain (" + user.getUniversity().getDomain() + ")");
        }
        HostApplication application = new HostApplication();
        application.setUser(user);
        application.setCollegeEmail(request.getCollegeEmail());
        application.setPhone(request.getPhone());
        application.setStatus(HostStatus.PENDING);
        hostApplicationRepository.save(application);
    }

    @Override
    @Transactional
    public void approveHost(Long hostId, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User hod = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
       if(!hod.getSystemRole().equals(SystemRole.HOD)){
            throw new AccessDeniedException("Restricted Feature");
        }
        HostApplication profile = hostApplicationRepository.findById(hostId)
                .orElseThrow(() -> new RuntimeException("Not found"));
        if(!profile.getUser().getUniversity().equals(hod.getUniversity())){
            throw new AccessDeniedException(
                    "You cannot approve host application from another university"
            );
        }
        profile.setStatus(HostStatus.APPROVED);
    }

    @Override
    public void rejectHost(Long hostId, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User hod = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        if(!hod.getSystemRole().equals(SystemRole.HOD)){
            throw new AccessDeniedException(
                    "You can't reject application you are not a hod"
            );
        }
        HostApplication profile = hostApplicationRepository.findById(hostId)
                .orElseThrow(() -> new RuntimeException("Not found"));
        if(!profile.getUser().getUniversity().equals(hod.getUniversity())){
            throw new AccessDeniedException(
                    "You cannot reject host application from another university"
            );
        }
        profile.setStatus(HostStatus.REJECTED);
        hostApplicationRepository.save(profile);
    }

    @Override
    public List<HostApplication> pendingHost(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User hod = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        if(!hod.getSystemRole().equals(SystemRole.HOD)){
            throw new AccessDeniedException("Restricted Feature");
        }
        return hostApplicationRepository.findByUser_UniversityAndStatus(hod.getUniversity(),HostStatus.PENDING);
    }

    @Override
    @Transactional
    public void approveEvent(Long eventId, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User hod = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        if(!hod.getSystemRole().equals(SystemRole.HOD)){
            throw new AccessDeniedException("Restricted Feature");
        }
        Event event = eventRepository.findById(eventId)
                .orElseThrow(()->new EventNotExistException("Event not found"));
        if(!event.getUniversity().equals(hod.getUniversity())){
            throw new AccessDeniedException(
                    "You cannot approve events from another university"
            );
        }
        event.setEventStatus(EventStatus.APPROVED);
    }

    @Override
    @Transactional
    public void rejectEvent(Long eventId, Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User hod = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        if(!hod.getSystemRole().equals(SystemRole.HOD)){
            throw new AccessDeniedException("Restricted Feature");
        }
        Event event = eventRepository.findById(eventId)
                .orElseThrow(()->new EventNotExistException("Event not found"));
        if(!event.getUniversity().equals(hod.getUniversity())){
            throw new AccessDeniedException(
                    "You cannot approve events from another university"
            );
        }
        event.setEventStatus(EventStatus.APPROVED);
    }

    @Override
    public List<EventSummaryResponse> pendingEvent(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User hod = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        if(!hod.getSystemRole().equals(SystemRole.HOD)){
            throw new AccessDeniedException("Restricted Feature");
        }
        List<Event> events = eventRepository.findByEventStatusAndUniversity(EventStatus.PENDING, hod.getUniversity());
        return events.stream()
                .map(event -> new EventSummaryResponse(
                        event.getEventId(),
                        event.getTitle(),
                        event.getLocation(),
                        event.getEventDate(),
                        event.getBannerUrl(),
                        event.getCategory(),
                        event.getTicketPrice(),
                        event.getEventStatus(),
                        event.getUniversity() != null ? event.getUniversity().getLogoUrl() : null
                ))
                .toList();
    }

    @Override
    public List<HostApplication> approvedHost(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User hod = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        if(!hod.getSystemRole().equals(SystemRole.HOD)){
            throw new AccessDeniedException("Restricted Feature");
        }

        return hostApplicationRepository.findByUser_UniversityAndStatus(hod.getUniversity(),HostStatus.APPROVED);
    }

    @Override
    public List<HostApplication> rejectedHost(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User hod = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        if(!hod.getSystemRole().equals(SystemRole.HOD)){
            throw new AccessDeniedException("Restricted Feature");
        }
        return hostApplicationRepository.findByUser_UniversityAndStatus(hod.getUniversity(),HostStatus.REJECTED);

    }

    @Override
    public List<EventSummaryResponse> approvedEvent(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User hod = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        if(!hod.getSystemRole().equals(SystemRole.HOD)){
            throw new AccessDeniedException("Restricted Feature");
        }
        List<Event> events = eventRepository.findByEventStatusAndUniversity(EventStatus.APPROVED, hod.getUniversity());
        return events.stream()
                .map(event -> new EventSummaryResponse(
                        event.getEventId(),
                        event.getTitle(),
                        event.getLocation(),
                        event.getEventDate(),
                        event.getBannerUrl(),
                        event.getCategory(),
                        event.getTicketPrice(),
                        event.getEventStatus(),
                        event.getUniversity() != null ? event.getUniversity().getLogoUrl() : null
                ))
                .toList();
    }

    @Override
    public List<EventSummaryResponse> rejectedEvent(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        User hod = userRepository.findByUserId(userDetails.getId())
                .orElseThrow(() -> new UserNotFoundException("User not found"));
        if(!hod.getSystemRole().equals(SystemRole.HOD)){
            throw new AccessDeniedException("Restricted Feature");
        }
        List<Event> events = eventRepository.findByEventStatusAndUniversity(EventStatus.REJECTED, hod.getUniversity());
        return events.stream()
                .map(event -> new EventSummaryResponse(
                        event.getEventId(),
                        event.getTitle(),
                        event.getLocation(),
                        event.getEventDate(),
                        event.getBannerUrl(),
                        event.getCategory(),
                        event.getTicketPrice(),
                        event.getEventStatus(),
                        event.getUniversity() != null ? event.getUniversity().getLogoUrl() : null
                ))
                .toList();
    }
}
