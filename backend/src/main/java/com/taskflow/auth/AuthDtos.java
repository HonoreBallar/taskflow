package com.taskflow.auth;

import com.taskflow.users.UserDto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank(message = "Email obligatoire") @Email(message = "Email invalide") @Size(max = 254) String email,
            @NotBlank(message = "Mot de passe obligatoire") @Size(max = 200) String password) {
    }

    public record RegisterRequest(
            @NotBlank(message = "Nom obligatoire") @Size(max = 80) String lastname,
            @NotBlank(message = "Prénom obligatoire") @Size(max = 80) String firstname,
            @NotBlank(message = "Email obligatoire") @Email(message = "Email invalide") @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 72, message = "Entre 8 et 72 caractères") String password) {
    }

    /** Le JWT n'apparaît jamais dans le corps de la réponse : il est posé dans un cookie HttpOnly. */
    public record AuthResponse(long expiresIn, UserDto user) {
    }

    /**
     * Si {@code verificationRequired} est vrai, aucune session n'est ouverte : l'utilisateur doit d'abord
     * confirmer son adresse via le lien reçu par email ({@code user} est alors null).
     */
    public record RegisterResponse(boolean verificationRequired, Long expiresIn, UserDto user) {
    }

    public record ForgotPasswordRequest(@NotBlank @Email @Size(max = 254) String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank @Size(max = 200) String token,
            @NotBlank @Size(min = 8, max = 72, message = "Entre 8 et 72 caractères") String password) {
    }

    public record VerifyEmailRequest(@NotBlank @Size(max = 200) String token) {
    }

    public record VerifyEmailResponse(boolean emailChanged, String message) {
    }
}
