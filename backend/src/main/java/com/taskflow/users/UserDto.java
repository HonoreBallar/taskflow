package com.taskflow.users;

import java.time.Instant;

public record UserDto(
        Long id,
        String firstname,
        String lastname,
        String email,
        Role role,
        String avatarUrl,
        boolean blocked,
        Instant createdAt
) {
    public static UserDto from(User u) {
        if (u == null) return null;
        String avatar = u.getAvatarPath() != null ? "/api/users/" + u.getId() + "/avatar" : null;
        return new UserDto(u.getId(), u.getFirstname(), u.getLastname(), u.getEmail(), u.getRole(),
                avatar, u.isBlocked(), u.getCreatedAt());
    }
}
