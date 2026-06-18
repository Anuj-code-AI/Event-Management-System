package org.anuj.EvenTAura.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.model.RefreshToken;
import org.anuj.EvenTAura.model.enums.AuthProvider;
import org.anuj.EvenTAura.model.enums.SystemRole;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.repository.RefreshTokenRepository;
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
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtUtil jwtUtil;
    @Value("${app.cookie.secure}")
    private boolean secureCookie;

    @Value("${app.cookie.same-site}")
    private String sameSite;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception{
        http
                .csrf().disable()
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/**",
                                        "/api/oauth2/**",
                                        "/oauth2/**","/error",
                                "/api/v1/event/ticket-updates",
                                "/api/v1/event/getEvent/**",
                                "/api/v1/event/getAllEvents/**","/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/api/v1/event/getAllEvents","/api/v1/event/getAllApprovedEvents/**","/api/v1/event/getAllApprovedEvents",
                                "/registerForEvent/**","/hostedEvents/**","/adminPage","/moments","/campusEvents","/eventDetails/**","/indexTemp",
                                "/","/login","/register","/favicon.ico","/favicon.ico/**"
                                ,"/profile","/createEvent","/oauth","/aboutUs","/tickets","/customEvent","/becomeOrganizer",
                                "/uploads/**","/css/**","/js/**","/images/**", "/api/v1/tickets/*/qr").permitAll()
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

        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) auth;
        String provider = token.getAuthorizedClientRegistrationId();
        AuthProvider authProvider = AuthProvider.valueOf(provider.toUpperCase());

        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setName(name);
                    newUser.setEmail(email);
                    newUser.setPassword(""); // OAuth users don’t use password
                    newUser.setSystemRole(SystemRole.USER);
                    newUser.setProvider(authProvider);
                    return userRepository.save(newUser);
                });
        if (!user.getProvider().equals(authProvider)) {
            throw new RuntimeException("Account exists with different provider");
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
