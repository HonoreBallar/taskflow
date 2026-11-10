package com.taskflow.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

/**
 * Limite le nombre d'appels par minute et par adresse IP sur chaque endpoint public d'authentification
 * (connexion, inscription, mot de passe oublié, réinitialisation, confirmation d'email) :
 * force brute, création de comptes en masse, envoi d'emails en rafale.
 */
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final RateLimitStore store;
    private final int limitPerMinute;

    public AuthRateLimitFilter(RateLimitStore store, int limitPerMinute) {
        this.store = store;
        this.limitPerMinute = limitPerMinute;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !request.getRequestURI().startsWith("/api/auth/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        RateLimitStore.Hit hit = store.hit("ip|" + request.getRemoteAddr() + "|" + request.getRequestURI(), WINDOW);
        if (hit.count() > limitPerMinute) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(hit.retryAfterSeconds()));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write("{\"timestamp\":\"" + Instant.now() + "\",\"status\":429,"
                    + "\"message\":\"Trop de tentatives, réessayez dans une minute.\",\"errors\":null}");
            return;
        }
        chain.doFilter(request, response);
    }
}
