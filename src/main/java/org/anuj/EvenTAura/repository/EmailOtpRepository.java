package org.anuj.EvenTAura.repository;

import org.anuj.EvenTAura.model.EmailOtp;
import org.anuj.EvenTAura.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

public interface EmailOtpRepository extends JpaRepository<EmailOtp, Long> {
    Optional<EmailOtp> findByUser(User user);
    Optional<EmailOtp> findByOtp(String otp);
    void deleteByUser(User user);

    @Modifying
    @Transactional
    void deleteByExpiryTimeBefore(LocalDateTime time);
}
