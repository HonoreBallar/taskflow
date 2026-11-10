package com.taskflow.auth;

import com.taskflow.users.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Jeton de confirmation d'adresse email. Sans {@code newEmail}, il valide l'adresse d'un compte qui vient
 * d'être créé ; avec, il applique un changement d'adresse demandé depuis le profil.
 */
@Entity
@Table(name = "email_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Empreinte SHA-256 du jeton envoyé par email */
    @Column(nullable = false, unique = true)
    private String tokenHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    private String newEmail;

    @Column(nullable = false)
    private Instant expiresAt;
}
