package com.taskflow.notifications;

import java.time.Instant;

public record NotificationDto(Long id, String message, NotificationType type, String link, boolean read, Instant createdAt) {

    public static NotificationDto from(Notification n) {
        return new NotificationDto(n.getId(), n.getMessage(), n.getType(), n.getLink(), n.isRead(), n.getCreatedAt());
    }
}
