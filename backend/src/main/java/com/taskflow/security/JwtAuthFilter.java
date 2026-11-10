package com.taskflow.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Set;

/**
 * Authentifie la requête à partir du JWT, lu :
 * - dans le cookie HttpOnly de session (navigateur) ;
 * - ou dans le header {@code Authorization: Bearer} (clients d'API, Swagger).
 * Jamais dans l'URL, où il fuiterait dans les journaux d'accès, l'historique et le header Referer.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final JwtService jwtService;
    private final AppUserDetailsService userDetailsService;

    /** Les endpoints publics d'authentification n'ont pas besoin de session (connexion, déconnexion…). */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/api/auth/");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        boolean fromCookie = false;
        String token = null;
        if (header != null && header.startsWith("Bearer ")) {
            token = header.substring(7);
        } else {
            token = sessionCookie(request);
            fromCookie = token != null;
        }

        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            var authentication = userDetailsService.authenticate(jwtService.parse(token));
            if (authentication.isPresent()) {
                // Défense CSRF en profondeur, en plus de SameSite : une requête qui modifie des données et
                // s'appuie sur le cookie doit venir d'un navigateur qui annonce son origine. Cette origine
                // a déjà été validée par le filtre CORS (une origine non autorisée est rejetée avant ce point).
                if (fromCookie && !SAFE_METHODS.contains(request.getMethod())
                        && request.getHeader("Origin") == null && request.getHeader("Referer") == null) {
                    reject(response);
                    return;
                }
                authentication.get().setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication.get());
            }
        }
        chain.doFilter(request, response);
    }

    private static String sessionCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (AuthCookies.NAME.equals(cookie.getName()) && !cookie.getValue().isBlank()) return cookie.getValue();
        }
        return null;
    }

    private static void reject(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"timestamp\":\"" + Instant.now() + "\",\"status\":403,"
                + "\"message\":\"Origine de la requête non vérifiable\",\"errors\":null}");
    }
}
