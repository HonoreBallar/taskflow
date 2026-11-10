package com.taskflow.security;

import com.taskflow.auth.EmailTokenRepository;
import com.taskflow.common.Tokens;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.Instant;

/**
 * Compteurs de limitation de débit stockés en base : ils sont partagés entre toutes les instances de l'API
 * et survivent à un redémarrage (un attaquant ne remet pas les compteurs à zéro en provoquant un restart).
 * Chaque opération s'exécute dans sa propre transaction, indépendante de celle de l'appelant.
 */
@Service
public class RateLimitStore {

    /** Résultat d'un appel compté : nombre d'appels dans la fenêtre et secondes restantes avant son expiration. */
    public record Hit(int count, long retryAfterSeconds) {
    }

    private final RateLimitCounterRepository counters;
    private final EmailTokenRepository emailTokens;
    private final TransactionTemplate tx;

    public RateLimitStore(RateLimitCounterRepository counters, EmailTokenRepository emailTokens,
                          PlatformTransactionManager transactionManager) {
        this.counters = counters;
        this.emailTokens = emailTokens;
        this.tx = new TransactionTemplate(transactionManager);
        this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    /** Compte un appel pour cette clé et retourne le total dans la fenêtre courante. */
    public Hit hit(String key, Duration window) {
        String id = Tokens.hash(key);
        try {
            return tx.execute(status -> increment(id, window));
        } catch (DataIntegrityViolationException e) {
            // Deux premières requêtes simultanées pour la même clé : la ligne existe maintenant, on rejoue
            return tx.execute(status -> increment(id, window));
        }
    }

    private Hit increment(String id, Duration window) {
        Instant now = Instant.now();
        RateLimitCounter counter = counters.findForUpdate(id).orElse(null);
        if (counter == null) {
            counters.saveAndFlush(new RateLimitCounter(id, now, 1));
            return new Hit(1, window.toSeconds());
        }
        if (counter.getWindowStart().plus(window).isBefore(now)) {
            counter.setWindowStart(now);
            counter.setCount(1);
        } else {
            counter.setCount(counter.getCount() + 1);
        }
        long retryAfter = Math.max(1, Duration.between(now, counter.getWindowStart().plus(window)).toSeconds());
        return new Hit(counter.getCount(), retryAfter);
    }

    /** Nombre d'appels déjà comptés dans la fenêtre courante, sans en ajouter. */
    public int current(String key, Duration window) {
        Integer count = tx.execute(status -> counters.findById(Tokens.hash(key))
                .filter(c -> !c.getWindowStart().plus(window).isBefore(Instant.now()))
                .map(RateLimitCounter::getCount).orElse(0));
        return count == null ? 0 : count;
    }

    public void reset(String key) {
        String id = Tokens.hash(key);
        tx.executeWithoutResult(status -> {
            if (counters.existsById(id)) counters.deleteById(id);
        });
    }

    /** Purge horaire des compteurs périmés et des liens de confirmation expirés. */
    @Scheduled(fixedDelay = 3_600_000, initialDelay = 600_000)
    public void purge() {
        tx.executeWithoutResult(status -> {
            counters.deleteOlderThan(Instant.now().minus(Duration.ofDays(1)));
            emailTokens.deleteExpired(Instant.now());
        });
    }
}
