package org.anuj.EvenTAura.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.exception.AllExceptions.AuthProviderMismatchException;
import org.anuj.EvenTAura.model.RefreshToken;
import org.anuj.EvenTAura.model.University;
import org.anuj.EvenTAura.model.enums.AuthProvider;
import org.anuj.EvenTAura.model.enums.SystemRole;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.repository.RefreshTokenRepository;
import org.anuj.EvenTAura.repository.UniversityRepository;
import org.anuj.EvenTAura.repository.UserRepository;
import org.anuj.EvenTAura.util.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.RegexRequestMatcher;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final UserRepository userRepository;
    private final UniversityRepository universityRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtUtil jwtUtil;
    @Value("${app.cookie.secure}")
    private boolean secureCookie;

    @Value("${app.cookie.same-site}")
    private String sameSite;

    private University resolveUniversityFromEmail(String email) {

        if (email == null || email.isBlank() || !email.contains("@")) {
            return null;
        }

        String emailDomain =
                email.substring(email.lastIndexOf("@") + 1)
                        .trim()
                        .toLowerCase();

        return universityRepository
                .findByDomainIgnoreCase(emailDomain)
                .orElse(null);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception{
        http
                .csrf().disable()
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/favicon.ico","/favicon.ico/**","/css/**","/js/**","/images/**","/webjars/**",

                                "/" , "/about-us" , "/login" , "/register" , "/verify-email" , "/home" , "/universities" ,
                                "/campus-events" , "/event-management" , "/oauth" , "/request-event" , "/create-custom-form" , "/admin" , "/event-details/**" ,
                                "/event-details" , "/tickets" , "/my-events" , "/profile" , "/update-custom-form/**",
                                "/event-management/**", "/update-event/**", "/form-details/**", "/form-responses/**"
                        ).permitAll()
                        .requestMatchers(
                                // Public authentication
                                "/api/v1/auth/register",
                                "/api/v1/auth/**",

                                // Public events
                                "/api/v1/events/public-events/**",

                                // Public custom forms
                                "/api/v1/custom-forms/public-forms/**",

                                // Public university list
                                "/api/v1/universities-list",

                                // Public ticket QR
                                "/api/v1/tickets/*/qr"
                        ).permitAll()
                        // GET /api/v1/events/{eventId}
                        .requestMatchers(
                                new RegexRequestMatcher(
                                        "^/api/v1/events/[0-9]+$",
                                        "GET"
                                )
                        ).permitAll()
                    .anyRequest().authenticated()

                )

                .oauth2Login(oauth -> oauth
                                .successHandler(this::oauthSuccess)
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(
                                (req, res, e) -> res.sendError(HttpServletResponse.SC_UNAUTHORIZED)
                        )
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder(){
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    /**
     * OAuth2 success: upsert user, issue token pair.
     * refreshToken → HttpOnly cookie (NOT in redirect URL).
     * accessToken  → short-lived URL param (read once by /oauth page, then cleared from URL).
     */
    public void oauthSuccess(
            HttpServletRequest req,
            HttpServletResponse res,
            Authentication auth
    )throws IOException {

        OAuth2User oauthUser = (OAuth2User) auth.getPrincipal();
        String email = oauthUser.getAttribute("email");
        String name  = oauthUser.getAttribute("name");

        if (email == null || email.isBlank()) {
            throw new RuntimeException("Email not provided by OAuth provider");
        }

        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) auth;
        String provider = token.getAuthorizedClientRegistrationId();
        AuthProvider authProvider = AuthProvider.valueOf(provider.toUpperCase());

        // Automatically resolve university from email domain
        University university =
                resolveUniversityFromEmail(email);

        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setName(name);
                    newUser.setEmail(email);
                    newUser.setPassword(""); // OAuth users don’t use password
                    newUser.setSystemRole(SystemRole.USER);
                    newUser.setProvider(authProvider);
                    newUser.setUniversity(university);
                    return userRepository.save(newUser);
                });
        if (!user.getProvider().equals(authProvider)) {
            throw new AuthProviderMismatchException(
                    "An account already exists with a different authentication provider."
            );
        }

        /*
         * If the user already exists but university was not previously
         * assigned, resolve it now from the OAuth email domain.
         *
         * This also makes the migration safe for existing users.
         */
        if (user.getUniversity() == null && university != null) {
            user.setUniversity(university);
            userRepository.save(user);
        }

        String access = jwtUtil.generateAccessToken(user.getUserId(),user.getEmail(),user.getSystemRole());
        String refresh = jwtUtil.generateRefreshToken(user.getUserId());


        // Save refresh token to DB
        RefreshToken rt = new RefreshToken();
        rt.setToken(refresh);
        rt.setUser(user);
        rt.setExpiryDate(LocalDateTime.now().plusDays(7));
        refreshTokenRepository.save(rt);  // inject RefreshTokenRepository here

        // Refresh token in HttpOnly cookie — never in URL
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refresh)
                .httpOnly(true).secure(secureCookie).sameSite(sameSite)
                .path("/api/v1/auth/refresh").maxAge(Duration.ofDays(7)).build();
        res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        // Access token in URL is acceptable — it's short-lived (15 min)
        // The /oauth page must read it from URL and immediately store in memory, then replace history state
        res.sendRedirect("/oauth?access=" + access);
    }
}
