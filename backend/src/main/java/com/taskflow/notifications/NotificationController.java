package com.taskflow.notifications;

import com.taskflow.security.CurrentUserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationService service;
    private final CurrentUserService currentUser;

    @GetMapping
    public List<NotificationDto> list(@RequestParam(defaultValue = "30") int limit) {
        return service.list(currentUser.get(), limit);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", service.unreadCount(currentUser.get()));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        service.markRead(currentUser.get(), id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllRead() {
        service.markAllRead(currentUser.get());
        return ResponseEntity.noContent().build();
    }
}
