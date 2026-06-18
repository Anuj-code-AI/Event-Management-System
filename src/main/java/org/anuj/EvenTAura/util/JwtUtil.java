package org.anuj.EvenTAura.util;


import org.anuj.EvenTAura.model.enums.SystemRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.function.Function;

@Component
public class JwtUtil {

    @Value("${jwt.access.expiration}")
    private long accessExpiry;

    @Value("${jwt.refresh.expiration}")
    private long refreshExpiry;

    private final SecretKey key;

    // Assigning secret-key to KEY on immediate creation of this bean
    public JwtUtil(@Value("${app.secret-key}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    // Generates accessToken with lifetime of mins
    public String generateAccessToken(Long userId, String email, SystemRole role){
        return Jwts.builder()
                .setSubject(userId.toString())
                .claim("email",email)
                .claim("roles", List.of("ROLE_"+role.name()))
                .setIssuer("campushive")
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + accessExpiry))
                .signWith(key,SignatureAlgorithm.HS256)
                .compact();
    }

    // Generates refreshToken with lifetime of 7 days
    public String generateRefreshToken(Long userId){
        return Jwts.builder()
                .setSubject(userId.toString())
                .setIssuer("campushive")
                .setExpiration(new Date(System.currentTimeMillis() + refreshExpiry))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * 1. The Main Method: Extracts the Email (Subject)
     */
    public String extractEmail(String token) {
        return extractClaim(token, claims -> claims.get("email", String.class));
    }

    public Long extractUserId(String token) {
        String subject = extractClaim(token, Claims::getSubject);
        return subject != null ? Long.parseLong(subject) : null;
    }
    /**
     * 2. A Generic Helper: Extracts ANY specific claim you want
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        if (claims == null) {
            return null; // Token was invalid
        }
        return claimsResolver.apply(claims);
    }

    /**
     * 3. The Core Parser: Parses the token (using the try-catch we built earlier)
     */
    public Claims extractAllClaims(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (JwtException e) {
            // The token is invalid (expired, tampered with, or incorrectly formatted)
            System.out.println("Invalid JWT Token: " + e.getMessage());

            // Return null so the calling method knows the token was rejected

            return null;
        }
    }
}
