package com.taskflow.security;

import com.taskflow.common.ApiException;
import com.taskflow.users.Role;
import com.taskflow.users.User;
import com.taskflow.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    /** Le principal posé par {@link JwtAuthFilter} est l'identifiant de l'utilisateur. */
    public User get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) throw unauthenticated();
        long id;
        try {
            id = Long.parseLong(auth.getName());
        } catch (NumberFormatException e) {
            throw unauthenticated(); // authentification anonyme
        }
        return userRepository.findById(id).orElseThrow(CurrentUserService::unauthenticated);
    }

    private static ApiException unauthenticated() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "Non authentifié");
    }

    public static boolean isAdmin(User u) {
        return u.getRole() == Role.ADMIN;
    }

    public static boolean isManagerOrAdmin(User u) {
        return u.getRole() == Role.ADMIN || u.getRole() == Role.MANAGER;
    }

    public static void requireManager(User u) {
        if (!isManagerOrAdmin(u)) throw ApiException.forbidden();
    }
}
