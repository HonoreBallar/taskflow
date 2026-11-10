package com.taskflow.common;

import java.nio.charset.StandardCharsets;

/** Règles communes à tous les points d'entrée qui définissent un mot de passe. */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 8;
    /** BCrypt ignore (ou refuse) tout ce qui dépasse 72 octets. */
    public static final int MAX_BYTES = 72;

    private PasswordPolicy() {
    }

    public static void validate(String password) {
        if (password == null || password.length() < MIN_LENGTH) {
            throw ApiException.badRequest("Mot de passe : " + MIN_LENGTH + " caractères minimum");
        }
        if (tooLong(password)) {
            throw ApiException.badRequest("Mot de passe trop long (" + MAX_BYTES + " octets maximum)");
        }
    }

    public static boolean tooLong(String password) {
        return password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES;
    }
}
