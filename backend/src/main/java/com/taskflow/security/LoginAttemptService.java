package com.taskflow.security;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;

/**
 * Ralentit la force brute sur un compte : après {@value #MAX_FAILURES} échecs en 15 minutes pour un couple
 * (email, adresse IP), les tentatives suivantes sont refusées jusqu'à la fin de la fenêtre.
 * La clé inclut l'IP pour qu'un attaquant ne puisse pas verrouiller le compte d'un autre utilisateur.
 */
@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    public static final int MAX_FAILURES = 5;
    private static final Duration WINDOW = Duration.ofMinutes(15);

    private final RateLimitStore store;

    public boolean isBlocked(String email, String ip) {
        return store.current(key(email, ip), WINDOW) >= MAX_FAILURES;
    }

    public void recordFailure(String email, String ip) {
        store.hit(key(email, ip), WINDOW);
    }

    public void reset(String email, String ip) {
        store.reset(key(email, ip));
    }

    private static String key(String email, String ip) {
        return "login|" + email + "|" + ip;
    }
}
