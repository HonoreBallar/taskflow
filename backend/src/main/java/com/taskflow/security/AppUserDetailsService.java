package com.taskflow.security;

import com.taskflow.users.User;
import com.taskflow.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /** Utilisé uniquement à la connexion (email + mot de passe). */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable"));
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                .accountLocked(user.isBlocked())
                .build();
    }

    /**
     * Authentification à partir d'un JWT : l'utilisateur doit exister, ne pas être bloqué, et le token
     * doit porter la version de session courante (incrémentée à chaque changement de mot de passe).
     * Le principal est l'identifiant de l'utilisateur ; le rôle est relu en base à chaque requête.
     */
    public Optional<UsernamePasswordAuthenticationToken> authenticate(JwtService.TokenData token) {
        if (token == null) return Optional.empty();
        return userRepository.findById(token.userId())
                .filter(u -> !u.isBlocked() && u.getTokenVersion() == token.version())
                .map(u -> new UsernamePasswordAuthenticationToken(String.valueOf(u.getId()), null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole().name()))));
    }
}
