package org.anuj.EvenTAura.util;

import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.model.enums.AuthProvider;
import org.anuj.EvenTAura.model.enums.SystemRole;
import org.anuj.EvenTAura.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${app.admin-name}")
    private String adminName;

    @Value("${app.admin-email}")
    private String adminEmail;

    @Value("${app.admin-password}")
    private String adminPassword;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void runAfterStartup() {

        if (adminEmail == null || adminEmail.isBlank()) {
            throw new IllegalStateException("ADMIN_EMAIL is not configured");
        }

        if (adminPassword == null || adminPassword.isBlank()) {
            throw new IllegalStateException("ADMIN_PASSWORD is not configured");
        }

        User admin = userRepository.findByEmail(adminEmail)
                .orElse(null);

        // ============================================================
        // ADMIN DOES NOT EXIST -> CREATE
        // ============================================================

        if (admin == null) {

            admin = new User();

            admin.setName(adminName);
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(adminPassword));

            admin.setSystemRole(SystemRole.SUPER_ADMIN);
            admin.setProvider(AuthProvider.LOCAL);
            admin.setEmailVerified(true);
            admin.setIsActive(true);
            admin.setUniversity(null);

            userRepository.save(admin);

            System.out.println("----------------------------");
            System.out.println("Admin account created");
            System.out.println("Name  : " + adminName);
            System.out.println("Email : " + adminEmail);
            System.out.println("----------------------------");

            return;
        }

        // ============================================================
        // ADMIN EXISTS -> VERIFY / UPDATE
        // ============================================================

        boolean changed = false;

        // Make sure this account is SUPER_ADMIN
        if (admin.getSystemRole() != SystemRole.SUPER_ADMIN) {
            admin.setSystemRole(SystemRole.SUPER_ADMIN);
            changed = true;
        }

        // Make sure the account is a LOCAL account
        if (admin.getProvider() != AuthProvider.LOCAL) {
            admin.setProvider(AuthProvider.LOCAL);
            changed = true;
        }

        // Make sure email is verified
        if (!Boolean.TRUE.equals(admin.getEmailVerified())) {
            admin.setEmailVerified(true);
            changed = true;
        }

        // Make sure account is active
        if (!Boolean.TRUE.equals(admin.getIsActive())) {
            admin.setIsActive(true);
            changed = true;
        }

        // Keep admin name synchronized with environment
        if (adminName != null
                && !adminName.isBlank()
                && !adminName.equals(admin.getName())) {

            admin.setName(adminName);
            changed = true;
        }

        // ============================================================
        // PASSWORD CHECK
        //
        // If ADMIN_PASSWORD in Render is changed, this will detect
        // the mismatch and replace the stored BCrypt password.
        // ============================================================

        if (admin.getPassword() == null
                || !passwordEncoder.matches(
                adminPassword,
                admin.getPassword()
        )) {

            admin.setPassword(passwordEncoder.encode(adminPassword));
            changed = true;

            System.out.println("----------------------------");
            System.out.println("Admin password updated");
            System.out.println("Email : " + adminEmail);
            System.out.println("----------------------------");
        }

        if (changed) {
            userRepository.save(admin);
        } else {
            System.out.println("----------------------------");
            System.out.println("Admin account verified");
            System.out.println("Name  : " + admin.getName());
            System.out.println("Email : " + admin.getEmail());
            System.out.println("----------------------------");
        }
    }
}