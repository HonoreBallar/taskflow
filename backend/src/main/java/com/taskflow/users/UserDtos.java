package com.taskflow.users;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class UserDtos {

    private UserDtos() {
    }

    public record ProfileRequest(
            @NotBlank(message = "Prénom obligatoire") @Size(max = 80) String firstname,
            @NotBlank(message = "Nom obligatoire") @Size(max = 80) String lastname,
            @NotBlank @Email(message = "Email invalide") @Size(max = 254) String email,
            /** Obligatoire uniquement pour changer d'adresse email (l'identifiant de connexion). */
            @Size(max = 200) String currentPassword) {
    }

    public record ChangePasswordRequest(
            @NotBlank @Size(max = 200) String currentPassword,
            @NotBlank @Size(min = 8, max = 72, message = "Entre 8 et 72 caractères") String newPassword) {
    }

    /** Création / modification par un administrateur (mot de passe optionnel en modification). */
    public record AdminUserRequest(
            @NotBlank @Size(max = 80) String firstname,
            @NotBlank @Size(max = 80) String lastname,
            @NotBlank @Email @Size(max = 254) String email,
            @Size(max = 72) String password,
            Role role) {
    }

    public record RoleRequest(@NotNull Role role) {
    }

    public record BlockRequest(boolean blocked) {
    }
}
