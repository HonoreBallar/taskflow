package com.taskflow.users;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String firstname;

    @Column(nullable = false)
    private String lastname;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private String avatarPath;

    @Builder.Default
    @Column(nullable = false)
    private boolean blocked = false;

    /**
     * Version des sessions : incluse dans chaque JWT et incrémentée quand le mot de passe ou l'email change,
     * ce qui invalide immédiatement tous les tokens émis auparavant.
     */
    @Builder.Default
    @Column(name = "token_version", nullable = false, columnDefinition = "integer default 0")
    private int tokenVersion = 0;

    /**
     * Faux tant qu'un compte créé par inscription n'a pas confirmé son adresse : la connexion est alors refusée.
     * Les comptes existants et ceux créés par un administrateur sont considérés comme vérifiés.
     */
    @Builder.Default
    @Column(name = "email_verified", nullable = false, columnDefinition = "boolean default true")
    private boolean emailVerified = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (role == null) role = Role.USER;
    }

    public String getFullName() {
        return firstname + " " + lastname;
    }
}
