package com.cyepro.engine.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-ms:86400000}")
    private long expirationMs;

    private SecretKey getSigningKey() {
        // Pad the secret to at least 32 bytes for HS256
        String padded = secret;
        while (padded.getBytes(StandardCharsets.UTF_8).length < 32) {
            padded = padded + secret;
        }
        return Keys.hmacShaKeyFor(padded.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(UUID id, String email, String role) {
        return Jwts.builder()
                .subject(id.toString())
                .claim("email", email)
                .claim("role", role)
                .claim("id", id.toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            Claims claims = parseToken(token);
            return claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }
}
