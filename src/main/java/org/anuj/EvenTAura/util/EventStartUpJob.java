package org.anuj.EvenTAura.util;


import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.model.enums.AuthProvider;
import org.anuj.EvenTAura.model.enums.SystemRole;
import org.anuj.EvenTAura.repository.UserRepository;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class EventStartUpJob {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public User createUser(){
        User user = new User();
        user.setName("Admin");
        user.setIsActive(true);
        user.setPrimaryEmail("admin@gmail.com");
        user.setPassword(passwordEncoder.encode("admin@1234"));
        user.setSystemRole(SystemRole.SUPER_ADMIN);
        user.setProvider(AuthProvider.LOCAL);
        userRepository.save(user);
        return user;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void runAfterStartup(){
        User user = userRepository.findByPrimaryEmail("admin@gmail.com")
                .orElseGet(this::createUser);
        System.out.println("Name: " + user.getName());
        System.out.println("Email: " + user.getPrimaryEmail());
        System.out.println("Password: admin@1234");
    }

}
