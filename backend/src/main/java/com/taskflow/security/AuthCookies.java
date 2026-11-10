package com.taskflow.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Le JWT de session voyage dans un cookie HttpOnly : il est inaccessible au JavaScript de la page,
 * donc une faille XSS ne permet plus de le voler (contrairement au localStorage).
 * - SameSite=Strict (défaut) : le navigateur ne joint pas le cookie aux requêtes venant d'un autre site (CSRF) ;
 * - Secure : à activer (COOKIE_SECURE=true) dès que l'application est servie en HTTPS.
 * Front et API sur deux domaines différents : COOKIE_SAME_SITE=None et COOKIE_SECURE=true.
 */
@Component
public class AuthCookies {

    public static final String NAME = "taskflow_session";

    private final boolean secure;
    private final String sameSite;

    public AuthCookies(@Value("${taskflow.cookie.secure:false}") boolean secure,
                       @Value("${taskflow.cookie.same-site:Strict}") String sameSite) {
        this.secure = secure;
        this.sameSite = sameSite;
    }

    public ResponseCookie session(String token, long maxAgeMs) {
        return build(token, Duration.ofMillis(maxAgeMs));
    }

    public ResponseCookie clear() {
        return build("", Duration.ZERO);
    }

    private ResponseCookie build(String value, Duration maxAge) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path("/")
                .maxAge(maxAge)
                .build();
    }
}
