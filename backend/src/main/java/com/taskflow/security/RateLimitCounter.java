package com.taskflow.security;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Compteur d'une fenêtre de limitation de débit, partagé par toutes les instances de l'API. */
@Entity
@Table(name = "rate_limit_counters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RateLimitCounter {

    /** Empreinte SHA-256 de la clé (adresse IP, email…) : aucune donnée personnelle en clair */
    @Id
    @Column(name = "counter_key", length = 64)
    private String key;

    @Column(nullable = false)
    private Instant windowStart;

    @Column(name = "hits", nullable = false)
    private int count;
}
