package com.taskflow.auth;

import com.taskflow.auth.AuthDtos.*;
import com.taskflow.security.AuthCookies;
import com.taskflow.security.JwtService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentification")
public class AuthController {

    private final AuthService authService;
    private final EmailVerificationService verification;
    private final AuthCookies cookies;
    private final JwtService jwtService;

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> register(@Valid @RequestBody RegisterRequest req) {
        Optional<AuthService.Session> session = authService.register(req);
        ResponseEntity.BodyBuilder response = ResponseEntity.status(HttpStatus.CREATED);
        if (session.isEmpty()) return response.body(new RegisterResponse(true, null, null));
        AuthResponse body = session.get().body();
        return withSession(response, session.get()).body(new RegisterResponse(false, body.expiresIn(), body.user()));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req, HttpServletRequest request) {
        AuthService.Session session = authService.login(req, request.getRemoteAddr());
        return withSession(ResponseEntity.ok(), session).body(session.body());
    }

    /** Efface le cookie de session (il est HttpOnly : le navigateur ne peut pas le supprimer lui-même). */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear().toString()).build();
    }

    @PostMapping("/verify-email")
    public ResponseEntity<VerifyEmailResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest req) {
        boolean emailChanged = verification.confirm(req.token());
        ResponseEntity.BodyBuilder response = ResponseEntity.ok();
        // Un changement d'adresse révoque les sessions : le cookie devenu inutile est effacé
        if (emailChanged) response.header(HttpHeaders.SET_COOKIE, cookies.clear().toString());
        return response.body(new VerifyEmailResponse(emailChanged, emailChanged
                ? "Votre nouvelle adresse email est confirmée. Reconnectez-vous avec celle-ci."
                : "Votre adresse email est confirmée. Vous pouvez vous connecter."));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.forgotPassword(req);
        return ResponseEntity.ok(Map.of("message", "Si un compte existe, un lien de réinitialisation a été envoyé."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req);
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity.BodyBuilder withSession(ResponseEntity.BodyBuilder response, AuthService.Session session) {
        return response.header(HttpHeaders.SET_COOKIE,
                cookies.session(session.token(), jwtService.getExpirationMs()).toString());
    }
}
