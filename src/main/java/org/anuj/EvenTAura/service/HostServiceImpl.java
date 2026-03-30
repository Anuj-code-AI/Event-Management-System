package org.anuj.EvenTAura.service;


import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.dto.EventSummaryResponse;
import org.anuj.EvenTAura.dto.HostRequest;
import org.anuj.EvenTAura.exception.EventNotExistException;
import org.anuj.EvenTAura.exception.UserNotFoundException;
import org.anuj.EvenTAura.model.*;
import org.anuj.EvenTAura.repository.EventRepository;
import org.anuj.EvenTAura.repository.HostProfileRepository;
import org.anuj.EvenTAura.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class HostServiceImpl implements HostService{
    private final HostProfileRepository hostProfileRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository;

    @Override
    public void applyForHost(Authentication authentication, HostRequest request) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(()-> new UserNotFoundException("User not found"));
        if (hostProfileRepository.existsByUserAndStatus(user,Status.PENDING)) {
            throw new RuntimeException("Application already pending");
        }

        if (hostProfileRepository.existsByUserAndStatus(user,Status.APPROVED)) {
            throw new RuntimeException("Already a host");
        }

        HostProfile profile = new HostProfile();
        profile.setUser(user);
        profile.setCollegeEmail(request.getCollegeEmail());
        profile.setPhone(request.getPhone());
        profile.setStatus(Status.PENDING);

        hostProfileRepository.save(profile);
    }

    @Override
    public void approveHost(Long hostId, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(()-> new UserNotFoundException("No user exist"));
        if(!user.getRole().equals(Role.ROLE_ADMIN)){
            throw new RuntimeException("You are not a admin. You can't approve request");
        }

        HostProfile profile = hostProfileRepository.findById(hostId)
                .orElseThrow(() -> new RuntimeException("Not found"));

        profile.setStatus(Status.APPROVED);
        hostProfileRepository.save(profile);
    }

    @Override
    public void rejectHost(Long hostId, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(()-> new UserNotFoundException("No user exist"));
        if(!user.getRole().equals(Role.ROLE_ADMIN)){
            throw new RuntimeException("You are not a admin. You can't approve request");
        }
        HostProfile profile = hostProfileRepository.findById(hostId)
                .orElseThrow(() -> new RuntimeException("Not found"));

        profile.setStatus(Status.REJECTED);
        hostProfileRepository.save(profile);
    }

    @Override
    public List<HostProfile> pendingHost(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(()-> new UserNotFoundException("No user exist"));
        if(!user.getRole().equals(Role.ROLE_ADMIN)){
            throw new RuntimeException("You are not a admin.");
        }
        List<HostProfile> profiles = hostProfileRepository.findByStatus(Status.PENDING);
        return profiles;
    }

    @Override
    public void approveEvent(Long eventId, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(()-> new UserNotFoundException("No user exist"));
        if(!user.getRole().equals(Role.ROLE_ADMIN)){
            throw new RuntimeException("You are not a admin. You can't approve request");
        }
        Event event = eventRepository.findById(eventId)
                .orElseThrow(()->new EventNotExistException("Event not found"));
        event.setEventStatus(EventStatus.APPROVED);
        eventRepository.save(event);
    }

    @Override
    public void rejectEvent(Long eventId, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(()-> new UserNotFoundException("No user exist"));
        if(!user.getRole().equals(Role.ROLE_ADMIN)){
            throw new RuntimeException("You are not a admin. You can't approve request");
        }
        Event event = eventRepository.findById(eventId)
                .orElseThrow(()->new EventNotExistException("Event not found"));
        event.setEventStatus(EventStatus.REJECTED);
        eventRepository.save(event);
    }

    @Override
    public List<EventSummaryResponse> pendingEvent(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(()-> new UserNotFoundException("No user exist"));
        if(!user.getRole().equals(Role.ROLE_ADMIN)){
            throw new RuntimeException("You are not a admin. You can't approve request");
        }
        List<Event> events = eventRepository.findByEventStatus(EventStatus.PENDING);
        List<EventSummaryResponse> response = events.stream()
                .map(event -> new EventSummaryResponse(
                        event.getEventId(),
                        event.getTitle(),
                        event.getLocation(),
                        event.getEventDate(),
                        event.getBannerUrl(),
                        event.getCategory(),
                        event.getTicketsAvailable(),
                        event.getEventStatus()
                ))
                .toList();
        return response;
    }

    @Override
    public List<HostProfile> approvedHost(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(()-> new UserNotFoundException("No user exist"));
        if(!user.getRole().equals(Role.ROLE_ADMIN)){
            throw new RuntimeException("You are not a admin.");
        }
        List<HostProfile> profiles = hostProfileRepository.findByStatus(Status.APPROVED);
        return profiles;
    }

    @Override
    public List<HostProfile> rejectedHost(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(()-> new UserNotFoundException("No user exist"));
        if(!user.getRole().equals(Role.ROLE_ADMIN)){
            throw new RuntimeException("You are not a admin.");
        }
        List<HostProfile> profiles = hostProfileRepository.findByStatus(Status.REJECTED);
        return profiles;
    }

    @Override
    public List<EventSummaryResponse> approvedEvent(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(()-> new UserNotFoundException("No user exist"));
        if(!user.getRole().equals(Role.ROLE_ADMIN)){
            throw new RuntimeException("You are not a admin. You can't approve request");
        }
        List<Event> events = eventRepository.findByEventStatus(EventStatus.APPROVED);
        List<EventSummaryResponse> response = events.stream()
                .map(event -> new EventSummaryResponse(
                        event.getEventId(),
                        event.getTitle(),
                        event.getLocation(),
                        event.getEventDate(),
                        event.getBannerUrl(),
                        event.getCategory(),
                        event.getTicketsAvailable(),
                        event.getEventStatus()
                ))
                .toList();
        return response;
    }

    @Override
    public List<EventSummaryResponse> rejectedEvent(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(()-> new UserNotFoundException("No user exist"));
        if(!user.getRole().equals(Role.ROLE_ADMIN)){
            throw new RuntimeException("You are not a admin. You can't approve request");
        }
        List<Event> events = eventRepository.findByEventStatus(EventStatus.REJECTED);
        List<EventSummaryResponse> response = events.stream()
                .map(event -> new EventSummaryResponse(
                        event.getEventId(),
                        event.getTitle(),
                        event.getLocation(),
                        event.getEventDate(),
                        event.getBannerUrl(),
                        event.getCategory(),
                        event.getTicketsAvailable(),
                        event.getEventStatus()
                ))
                .toList();
        return response;
    }
}
