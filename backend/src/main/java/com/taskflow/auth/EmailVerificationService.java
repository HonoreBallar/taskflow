package com.taskflow.auth;

import com.taskflow.admin.ActivityLogService;
import com.taskflow.common.ApiException;
import com.taskflow.common.Tokens;
import com.taskflow.mail.MailService;
import com.taskflow.users.User;
import com.taskflow.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

/**
 * Prouve qu'un utilisateur contrôle bien une adresse email avant qu'elle ne devienne son identifiant :
 * à l'inscription (le compte reste inutilisable tant que le lien n'a pas été ouvert) et au changement
 * d'adresse (l'ancienne reste en vigueur jusqu'à confirmation de la nouvelle).
 */
@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final Duration VALIDITY = Duration.ofHours(24);

    private final EmailTokenRepository tokens;
    private final UserRepository users;
    private final MailService mail;
    private final ActivityLogService activityLog;

    @Value("${taskflow.frontend-url}")
    private String frontendUrl;

    @Value("${taskflow.email-verification:true}")
    private boolean enabled;

    public boolean isEnabled() {
        return enabled;
    }

    /** Envoie (ou renvoie) le lien de confirmation d'un compte non vérifié. */
    @Transactional
    public void sendRegistrationLink(User user) {
        String token = issue(user, null);
        mail.sendLink(user.getEmail(), "Confirmez votre adresse email",
                "Bienvenue sur TaskFlow ! Pour activer votre compte, confirmez votre adresse en ouvrant ce lien "
                        + "(valable 24 heures) :", link(token));
    }

    /** Le lien part vers la NOUVELLE adresse : elle n'est appliquée qu'une fois confirmée. */
    @Transactional
    public void sendEmailChangeLink(User user, String newEmail) {
        String token = issue(user, newEmail);
        mail.sendLink(newEmail, "Confirmez votre nouvelle adresse email",
                "Vous avez demandé à utiliser cette adresse pour votre compte TaskFlow. Confirmez-la en ouvrant "
                        + "ce lien (valable 24 heures) :", link(token));
    }

    /** @return true si le lien confirmait un changement d'adresse (les sessions ouvertes sont alors fermées) */
    @Transactional
    public boolean confirm(String rawToken) {
        EmailToken token = tokens.findByTokenHash(Tokens.hash(rawToken))
                .filter(t -> t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> ApiException.badRequest("Lien invalide ou expiré"));
        User user = token.getUser();
        boolean emailChange = token.getNewEmail() != null;
        if (emailChange) {
            if (users.existsByEmailIgnoreCase(token.getNewEmail())) {
                tokens.delete(token);
                throw new ApiException(HttpStatus.CONFLICT, "Cette adresse email est désormais utilisée par un autre compte");
            }
            user.setEmail(token.getNewEmail());
            user.setTokenVersion(user.getTokenVersion() + 1);
            activityLog.log(user, "a changé d'adresse email");
        }
        user.setEmailVerified(true);
        tokens.deleteByUserId(user.getId());
        return emailChange;
    }

    private String issue(User user, String newEmail) {
        tokens.deleteByUserId(user.getId()); // un seul lien valide à la fois
        String token = Tokens.generate();
        tokens.save(EmailToken.builder().tokenHash(Tokens.hash(token)).user(user).newEmail(newEmail)
                .expiresAt(Instant.now().plus(VALIDITY)).build());
        return token;
    }

    private String link(String token) {
        return frontendUrl + "/verify-email?token=" + token;
    }
}
