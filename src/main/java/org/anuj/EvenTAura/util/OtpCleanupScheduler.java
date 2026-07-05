package org.anuj.EvenTAura.util;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.anuj.EvenTAura.repository.EmailOtpRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class OtpCleanupScheduler {

    private final EmailOtpRepository otpRepository;

    // Clean up expired OTPs every 10 minutes
    @Scheduled(fixedRate = 86400)
    public void cleanExpiredOtps() {
        log.info("Starting expired OTP cleanup task...");
        try {
            LocalDateTime now = LocalDateTime.now();
            otpRepository.deleteByExpiryTimeBefore(now);
            log.info("Expired OTP cleanup task completed successfully.");
        } catch (Exception e) {
            log.error("Error occurred while cleaning expired OTPs", e);
        }
    }
}
