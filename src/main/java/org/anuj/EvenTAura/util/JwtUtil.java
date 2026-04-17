package org.anuj.EvenTAura.util;


import org.anuj.EvenTAura.model.Role;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {
    private final SecretKey key;

    public JwtUtil(@Value("${app.secret-key}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateAccessToken(String email, Role role){
        return Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .claim("role",role)
                .setExpiration(new Date(System.currentTimeMillis()+900000))
                .signWith(key,SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateRefreshToken(String email){
        return Jwts.builder()
                .setSubject(email)
                .setExpiration(new Date(System.currentTimeMillis() + 604800000))
                .signWith(key)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parserBuilder().setSigningKey(key)
                .build().parseClaimsJws(token).getBody();
    }
}
