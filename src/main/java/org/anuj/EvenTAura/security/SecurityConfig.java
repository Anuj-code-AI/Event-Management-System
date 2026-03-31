package org.anuj.EvenTAura.security;


import io.jsonwebtoken.Jwt;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.anuj.EvenTAura.model.Role;
import org.anuj.EvenTAura.model.User;
import org.anuj.EvenTAura.repository.UserRepository;
import org.anuj.EvenTAura.util.JwtUtil;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

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
                                "/api/v1/event/getAllEvents/**",
                                "/api/v1/event/getAllEvents","/api/v1/event/getAllApprovedEvents/**","/api/v1/event/getAllApprovedEvents",
                                "/registerForEvent/**","/hostedEvents/**","/adminPage","/moments","/campusEvents","/eventDetails/**",
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

    public void oauthSuccess(
            HttpServletRequest req,
            HttpServletResponse res,
            Authentication auth
    )throws IOException {
        OAuth2User oauthUser = (OAuth2User) auth.getPrincipal();
        String email = oauthUser.getAttribute("email");

        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                    User newUser = new User();
                    newUser.setEmail(email);
                    newUser.setPassword(""); // OAuth users don’t use password
                    newUser.setRole(Role.ROLE_USER);
                    return userRepository.save(newUser);
                });
        String access = jwtUtil.generateAccessToken(email, Role.ROLE_USER);
        String refresh = jwtUtil.generateRefreshToken(email);

        res.sendRedirect(
                "/oauth"
                        + "?access=" + access
                        + "&refresh=" + refresh
        );
    }
}
