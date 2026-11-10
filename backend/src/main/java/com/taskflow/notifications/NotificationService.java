package com.taskflow.notifications;

import com.taskflow.common.ApiException;
import com.taskflow.users.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class NotificationService {

    public static final String USER_QUEUE = "/queue/notifications";

    private final NotificationRepository repository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Crée une notification persistée puis la pousse en temps réel (STOMP)
     * une fois la transaction validée. N'envoie rien si le destinataire est l'auteur.
     */
    @Transactional
    public void notify(User recipient, User actor, NotificationType type, String message, String link) {
        if (recipient == null) return;
        if (actor != null && Objects.equals(recipient.getId(), actor.getId())) return;

        Notification saved = repository.save(Notification.builder()
                .user(recipient).type(type).message(message).link(link).build());
        NotificationDto dto = NotificationDto.from(saved);
        // Le principal d'une session STOMP est l'identifiant de l'utilisateur (voir WebSocketAuthInterceptor)
        String destinationUser = String.valueOf(recipient.getId());

        Runnable push = () -> messagingTemplate.convertAndSendToUser(destinationUser, USER_QUEUE, dto);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    push.run();
                }
            });
        } else {
            push.run();
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationDto> list(User user, int limit) {
        return repository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, Math.max(1, Math.min(limit, 100))))
                .stream().map(NotificationDto::from).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(User user) {
        return repository.countByUserIdAndReadFalse(user.getId());
    }

    @Transactional
    public void markRead(User user, Long id) {
        Notification n = repository.findById(id).orElseThrow(() -> ApiException.notFound("Notification"));
        if (!n.getUser().getId().equals(user.getId())) throw ApiException.forbidden();
        n.setRead(true);
    }

    @Transactional
    public void markAllRead(User user) {
        repository.markAllRead(user.getId());
    }
}
