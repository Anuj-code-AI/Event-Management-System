package org.anuj.EvenTAura.util;


import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.model.University;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.model.enums.AuthProvider;
import org.anuj.EvenTAura.model.enums.SystemRole;
import org.anuj.EvenTAura.repository.UniversityRepository;
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
    private final UniversityRepository universityRepository;

    private static final String DEFAULT_PASSWORD = "1234";

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void runAfterStartup() {

        // ================= UNIVERSITY =================
        University university = createUniversityIfNotExist();

        // ================= SUPER ADMIN =================
        createIfNotExists(
                "admin@gmail.com",
                "Admin",
                SystemRole.SUPER_ADMIN,
                null
        );

        // ================= HOD =================
        createIfNotExists(
                "hod@medicaps.ac.in",
                "HOD",
                SystemRole.HOD,
                university
        );

        // ================= USER =================
        createIfNotExists(
                "user@medicaps.ac.in",
                "User",
                SystemRole.USER,
                university
        );
    }

    // ============================================================
    // CREATE USER
    // ============================================================

    private User createUser(
            String email,
            String name,
            SystemRole role,
            University university
    ) {

        User user = new User();

        user.setName(name);
        user.setPrimaryEmail(email);
        user.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));

        user.setSystemRole(role);
        user.setProvider(AuthProvider.LOCAL);
        user.setEmailVerified(true);
        user.setIsActive(true);

        // SUPER_ADMIN -> null
        // HOD / USER -> Medicaps University
        user.setUniversity(university);

        return userRepository.save(user);
    }

    // ============================================================
    // CREATE USER IF NOT EXISTS
    // ============================================================

    private void createIfNotExists(
            String email,
            String name,
            SystemRole role,
            University university
    ) {

        User user = userRepository.findByPrimaryEmail(email)
                .orElseGet(() ->
                        createUser(
                                email,
                                name,
                                role,
                                university
                        )
                );

        System.out.println("----------------------------");
        System.out.println("Role       : " + user.getSystemRole());
        System.out.println("Name       : " + user.getName());
        System.out.println("Email      : " + user.getPrimaryEmail());
        System.out.println("University : " +
                (user.getUniversity() != null
                        ? user.getUniversity().getName()
                        : "None"));
        System.out.println("Password   : " + DEFAULT_PASSWORD);
    }

    // ============================================================
    // CREATE UNIVERSITY IF NOT EXISTS
    // ============================================================

    private University createUniversityIfNotExist() {

        return universityRepository
                .findByDomainIgnoreCase("medicaps.ac.in")
                .orElseGet(() -> {

                    University university = new University();

                    university.setName("Medicaps University");
                    university.setDomain("medicaps.ac.in");
                    university.setActive(true);

                    University saved =
                            universityRepository.save(university);

                    System.out.println("----------------------------");
                    System.out.println("University created:");
                    System.out.println("Name   : " + saved.getName());
                    System.out.println("Domain : " + saved.getDomain());

                    return saved;
                });
    }
}
