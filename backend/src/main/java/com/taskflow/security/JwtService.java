package com.taskflow.security;

import com.taskflow.users.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Date;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
public class JwtService {

    /** Contenu utile d'un token valide : identifiant de l'utilisateur et version de ses sessions. */
    public record TokenData(Long userId, int version) {
    }

    private static final int MIN_SECRET_BYTES = 64;

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${taskflow.jwt.secret:}") String secret,
                      @Value("${taskflow.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(resolveSecret(secret));
        this.expirationMs = expirationMs;
    }

    /**
     * Aucun secret par défaut n'est embarqué : un secret connu permettrait de forger des tokens administrateur.
     * Sans JWT_SECRET, un secret aléatoire est généré (les sessions ne survivent alors pas au redémarrage).
     */
    private static byte[] resolveSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            byte[] random = new byte[MIN_SECRET_BYTES];
            new SecureRandom().nextBytes(random);
            log.warn("JWT_SECRET non défini : secret aléatoire généré, les sessions seront invalidées au redémarrage.");
            return random;
        }
        if (secret.toLowerCase(Locale.ROOT).contains("change-me")) {
            throw new IllegalStateException(
                    "JWT_SECRET contient la valeur d'exemple : générez un secret aléatoire (ex : openssl rand -base64 64).");
        }
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("JWT_SECRET trop court : " + MIN_SECRET_BYTES + " octets minimum.");
        }
        return bytes;
    }

    /** Le sujet est l'identifiant (stable), jamais l'email : un email libéré puis repris ne réactive aucun token. */
    public String generateToken(User user) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claims(Map.of("role", user.getRole().name(), "ver", user.getTokenVersion()))
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    /** Retourne le contenu du token s'il est valide (signature, expiration), sinon null. */
    public TokenData parse(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            Integer version = claims.get("ver", Integer.class);
            if (claims.getSubject() == null || version == null) return null;
            return new TokenData(Long.valueOf(claims.getSubject()), version);
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public long getExpirationMs() {
        return expirationMs;
    }
}
