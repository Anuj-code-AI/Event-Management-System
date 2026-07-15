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
    public User createUser(SystemRole role, String name){
        User user = new User();
        user.setName(name);
        user.setIsActive(true);
        user.setPrimaryEmail(name+"@gmail.com");
        user.setPassword(passwordEncoder.encode("1234"));
        user.setSystemRole(role);
        user.setProvider(AuthProvider.LOCAL);
        user.setEmailVerified(true);
        userRepository.save(user);
        return user;
    }


    @EventListener(ApplicationReadyEvent.class)
    public void runAfterStartup() {
        createIfNotExists(SystemRole.SUPER_ADMIN, "admin");
        createIfNotExists(SystemRole.HOD, "hod");
        createIfNotExists(SystemRole.USER, "user");
    }

    private void createIfNotExists(SystemRole role, String name) {

        User user = userRepository.findByPrimaryEmail(name + "@gmail.com")
                .orElseGet(() -> createUser(role, name));

        System.out.println("----------------------------");
        System.out.println("Role     : " + user.getSystemRole());
        System.out.println("Name     : " + user.getName());
        System.out.println("Email    : " + user.getPrimaryEmail());
        System.out.println("Password : 1234");
    }

}
