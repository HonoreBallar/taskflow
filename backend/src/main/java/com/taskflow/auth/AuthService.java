package com.taskflow.auth;

import com.taskflow.admin.ActivityLogService;
import com.taskflow.auth.AuthDtos.*;
import com.taskflow.common.ApiException;
import com.taskflow.common.PasswordPolicy;
import com.taskflow.common.Tokens;
import com.taskflow.mail.MailService;
import com.taskflow.security.JwtService;
import com.taskflow.security.LoginAttemptService;
import com.taskflow.users.Role;
import com.taskflow.users.User;
import com.taskflow.users.UserDto;
import com.taskflow.users.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    /** Session ouverte : le JWT (destiné au cookie HttpOnly) et le corps de la réponse. */
    public record Session(String token, AuthResponse body) {
    }

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final LoginAttemptService loginAttempts;
    private final EmailVerificationService verification;
    private final MailService mail;
    private final ActivityLogService activityLog;

    @Value("${taskflow.frontend-url}")
    private String frontendUrl;

    /**
     * @return la session ouverte, ou vide si l'adresse email doit d'abord être confirmée.
     * Avec la vérification d'email, la réponse est la même que l'adresse soit déjà inscrite ou non :
     * l'inscription ne permet pas de savoir qui possède un compte.
     */
    @Transactional
    public Optional<Session> register(RegisterRequest req) {
        PasswordPolicy.validate(req.password());
        String email = req.email().trim().toLowerCase();
        boolean verify = verification.isEnabled();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            if (verify) return Optional.empty();
            throw new ApiException(HttpStatus.CONFLICT, "Cet email est déjà utilisé");
        }
        User user = userRepository.save(User.builder()
                .firstname(req.firstname().trim())
                .lastname(req.lastname().trim())
                .email(email)
                .password(passwordEncoder.encode(req.password()))
                .role(Role.USER)
                .emailVerified(!verify)
                .build());
        activityLog.log(user, "s'est inscrit");
        if (verify) {
            verification.sendRegistrationLink(user);
            return Optional.empty();
        }
        return Optional.of(open(user));
    }

    public Session login(LoginRequest req, String clientIp) {
        String email = req.email().trim().toLowerCase();
        if (loginAttempts.isBlocked(email, clientIp)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Trop de tentatives de connexion. Réessayez dans quelques minutes.");
        }
        try {
            if (PasswordPolicy.tooLong(req.password())) throw new BadCredentialsException("Mot de passe trop long");
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, req.password()));
        } catch (BadCredentialsException e) {
            loginAttempts.recordFailure(email, clientIp);
            throw e;
        }
        loginAttempts.reset(email, clientIp);
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow();
        if (verification.isEnabled() && !user.isEmailVerified()) {
            // Seul quelqu'un qui connaît le mot de passe arrive ici : on peut renvoyer le lien sans risque d'abus
            verification.sendRegistrationLink(user);
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "Votre adresse email n'est pas encore confirmée. Un nouveau lien vient de vous être envoyé.");
        }
        return open(user);
    }

    /**
     * Envoie un lien de réinitialisation à usage unique, valable une heure. Seule l'empreinte du jeton est
     * stockée : une fuite de la base ne permet pas de réinitialiser un mot de passe.
     * La réponse est identique que l'email existe ou non (pas d'énumération de comptes).
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest req) {
        userRepository.findByEmailIgnoreCase(req.email().trim()).ifPresent(user -> {
            resetTokenRepository.deleteByUserId(user.getId());
            String token = Tokens.generate();
            resetTokenRepository.save(PasswordResetToken.builder()
                    .token(Tokens.hash(token)).user(user).expiresAt(Instant.now().plus(Duration.ofHours(1))).build());
            log.info("Réinitialisation de mot de passe demandée pour l'utilisateur #{}", user.getId());
            mail.sendLink(user.getEmail(), "Réinitialisation de votre mot de passe",
                    "Une réinitialisation du mot de passe de votre compte TaskFlow a été demandée. "
                            + "Choisissez un nouveau mot de passe en ouvrant ce lien (valable 1 heure) :",
                    frontendUrl + "/auth/reset-password?token=" + token);
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        PasswordPolicy.validate(req.password());
        PasswordResetToken t = resetTokenRepository.findByToken(Tokens.hash(req.token()))
                .filter(tok -> !tok.isUsed() && tok.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> ApiException.badRequest("Lien invalide ou expiré"));
        User user = t.getUser();
        user.setPassword(passwordEncoder.encode(req.password()));
        user.setTokenVersion(user.getTokenVersion() + 1); // déconnecte toutes les sessions existantes
        // Le lien a été reçu par email : il prouve le contrôle de l'adresse. Le vrai propriétaire d'une adresse
        // récupère ainsi un compte qu'un tiers aurait créé à son nom sans jamais pouvoir le confirmer.
        user.setEmailVerified(true);
        t.setUsed(true);
        activityLog.log(user, "a réinitialisé son mot de passe");
    }

    private Session open(User user) {
        return new Session(jwtService.generateToken(user),
                new AuthResponse(jwtService.getExpirationMs(), UserDto.from(user)));
    }
}
