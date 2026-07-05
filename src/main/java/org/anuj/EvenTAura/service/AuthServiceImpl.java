package org.anuj.EvenTAura.service;


import io.jsonwebtoken.Claims;
import jakarta.mail.internet.MimeMessage;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.anuj.EvenTAura.dto.*;
import org.anuj.EvenTAura.exception.AllExceptions.*;
import org.anuj.EvenTAura.mapper.UserMapper;
import org.anuj.EvenTAura.model.*;
import org.anuj.EvenTAura.repository.*;
import org.anuj.EvenTAura.util.JwtUtil;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService{

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshRepository;
    private final UniversityRepository universityRepository;
    private final EmailOtpRepository otpRepository;
    private final JavaMailSender mailSender;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private String generateOtp(){
        return String.format("%06d",
                SECURE_RANDOM.nextInt(1_000_000));
    }

    private void createAndSendOtp(User user) {
        otpRepository.deleteByUser(user);

        String otp = generateOtp();

        EmailOtp emailOtp = new EmailOtp();
        emailOtp.setOtp(otp);
        emailOtp.setUser(user);
        emailOtp.setExpiryTime(LocalDateTime.now().plusMinutes(5));
        emailOtp.setCreatedAt(LocalDateTime.now());
        otpRepository.save(emailOtp);
        sendMail(user.getPrimaryEmail(), otp);
    }

    private void sendMail(String email, String otp) {
        String subject = "🔑 CampusHive Email Verification";

        // Modern HTML template with custom colors, padding, and styled layout
        String htmlBody = """
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; padding: 30px 15px; border-radius: 12px; max-width: 500px; margin: 0 auto; color: #333333;">
            <div style="background-color: #ffffff; padding: 35px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: center;">
        
                <!-- Brand Title -->
                <h1 style="color: #4F46E5; margin-top: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">CampusHive</h1>
        
                <p style="font-size: 16px; line-height: 1.5; color: #4B5563; margin-bottom: 25px;">
                    Welcome to CampusHive!<br>Use the verification code below to secure your account.
                </p>
        
                <!-- Main OTP Box -->
                <div style="background-color: #EEF2F6; color: #4F46E5; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 18px; border-radius: 8px; display: inline-block; min-width: 180px; margin: 10px 0 25px 0; border: 1px solid #E2E8F0;">
                    %s
                </div>
        
                <p style="font-size: 14px; color: #EF4444; font-weight: 500; margin-bottom: 25px;">
                    ⏰ This code will expire in 5 minutes.
                </p>
        
                <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 25px 0;">
        
                <p style="font-size: 12px; color: #9CA3AF; line-height: 1.4; margin-bottom: 0;">
                    If you didn't create this account, you can safely ignore this email.
                </p>
            </div>
        </div>
        """.formatted(otp);

        try {
            // 1. Create a blank MimeMessage container
            MimeMessage mimeMessage = mailSender.createMimeMessage();

            // 2. Use MimeMessageHelper with HTML support enabled (true flag) and UTF-8 encoding
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            helper.setTo(email);
            helper.setSubject(subject);

            // 3. Set the text content, passing 'true' as the second parameter to enable HTML rendering
            helper.setText(htmlBody, true);

            // 4. Send the fancy email
            mailSender.send(mimeMessage);

        } catch (Exception ex) {
            log.error("Failed to send verification email to {}", email, ex);
            throw new RuntimeException("Unable to send verification email.");
        }
    }


    @Override
    @Transactional
    public void register(RegisterRequest request) {
        if(userRepository.findByPrimaryEmail(request.getEmail()).isPresent() || userRepository.findBySecondaryEmail(request.getEmail()).isPresent()){
            throw new EmailAlreadyExistException("User with this email already registered");
        }
        University university =  null;
        if(request.getUniversity()!=null && !request.getUniversity().isBlank()){
            university = universityRepository.findByNameContainingIgnoreCase(request.getUniversity())
                    .orElseThrow(() ->
                            new UniversityNotSupportedException(
                                    "We are not currently serving this university. You may register without selecting a university."
                            ));
            if (university.getDomain() != null) {
                String email = request.getEmail();
                String emailDomain = email.substring(email.lastIndexOf("@") + 1);
                if (!emailDomain.equalsIgnoreCase(university.getDomain())) {
                    throw new RuntimeException("Your email domain (" + emailDomain + ") does not match the university domain (" + university.getDomain() + ").");
                }
            }
        }
        request.setPassword(passwordEncoder.encode(request.getPassword()));
        User user = UserMapper.toEntity(request, university);
        userRepository.save(user);
        createAndSendOtp(user);
    }

    @Override
    public void resendOtp(String email) {
        User user = userRepository.findByPrimaryEmail(email)
                .orElseThrow(()-> new UserNotFoundException("User not found"));
        EmailOtp emailOtp = otpRepository.findByUser(user)
                .orElseThrow(()->new RuntimeException("Otp not found"));

        if(emailOtp.getCreatedAt().plusSeconds(60)
                .isAfter(LocalDateTime.now())) {

            throw new RuntimeException(
                    "Please wait before requesting another OTP."
            );
        }
        createAndSendOtp(user);
    }

    @Override
    @Transactional(noRollbackFor = InvalidOtpException.class)
    public TokenPair verifyOtp(VerifyOtpRequest request) {
        User user = userRepository.findByPrimaryEmail(request.getEmail())
                .orElseThrow(()-> new UserNotFoundException("User not found"));
        if(user.getEmailVerified()){
            throw new RuntimeException("Email already verified");
        }
        EmailOtp otp = otpRepository.findByUser(user)
                .orElseThrow(()->new UserNotFoundException("User not found"));
        if(otp.getAttempts()>=5){
            otpRepository.delete(otp);
            throw new RuntimeException("Maximum verification attempts exceeded.\n" +
                    "Please request a new OTP.");
        }
        if(otp.getExpiryTime().isBefore(LocalDateTime.now())){
            otpRepository.delete(otp);
            throw new RuntimeException("Otp is expired");
        }

        if(!otp.getOtp().equals(request.getOtp())){
            otp.setAttempts(otp.getAttempts()+1);
            throw new InvalidOtpException("Invalid Otp");
        }
        user.setEmailVerified(true);
        otpRepository.delete(otp);
        return issueTokenPair(user);
    }

    // LOGIN SERVICE
    @Override
    public TokenPair login(LoginRequest req){
        User user = userRepository.findByPrimaryEmail(req.getEmail())
                .orElseThrow(()-> new UserNotFoundException("No account with this email"));
        if(!passwordEncoder.matches(req.getPassword(), user.getPassword()))
            throw new InvalidPasswordException("Incorrect password");
        if(!user.getIsActive()){
            throw new AccountIsDeactiveException("User account is deactivated");
        }
        if(!user.getEmailVerified()){
            throw new EmailNotVerifiedException("Please verify your email");
        }
        return issueTokenPair(user);
    }


    // REFRESH SERVICE
    @Override
    @Transactional
    public TokenPair refresh(String rawToken) {
        Claims claims = jwtUtil.extractAllClaims(rawToken);
        if (claims == null) {
            throw new TokenExpiredException("Invalid refresh token");
        }
        RefreshToken stored = refreshRepository.findByToken(rawToken)
                .orElseThrow(()->{
                    // Token not in DB: it was already rotated.
                    // Could be replay attack — revoke all sessions for this user.
                    Long userId = jwtUtil.extractUserId(rawToken);
                    if (userId != null) {
                        revokeAllForUserId(userId);
                    }
                    return new TokenReusedException("Token reuse detected — all sessions revoked");
                });

        if(stored.getExpiryDate().isBefore(LocalDateTime.now())){
            refreshRepository.delete(stored);
            throw new TokenExpiredException("Refresh token expired, please login again");
        }

        User user = stored.getUser();
        String newAccess  = jwtUtil.generateAccessToken(user.getUserId(), user.getPrimaryEmail(),user.getSystemRole());
        String newRefresh = jwtUtil.generateRefreshToken(user.getUserId());

        // Rotate in the same DB row (no extra insert)
        stored.setToken(newRefresh);
        stored.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshRepository.save(stored);

        return new TokenPair(newAccess, newRefresh);

    }


    // REVOKE USER TOKEN SERVICE
    @Override
    @Transactional
    public void revoke(String rawToken) {
        refreshRepository.findByToken(rawToken)
                .ifPresent(refreshRepository::delete);
    }

    // ── private helpers ──────────────────────────────────────────

    private TokenPair issueTokenPair(User user) {
        String access = jwtUtil.generateAccessToken(user.getUserId(), user.getPrimaryEmail(), user.getSystemRole());
        String refresh = jwtUtil.generateRefreshToken(user.getUserId());

        RefreshToken token = new RefreshToken();
        token.setToken(refresh);
        token.setUser(user);
        token.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshRepository.save(token);

        return new TokenPair(access,refresh);
    }


    public void revokeAllForUserId(Long userId) {
        if (userId == null) return;
        userRepository.findById(userId)
                .ifPresent(refreshRepository::deleteAllByUser);
    }
}
