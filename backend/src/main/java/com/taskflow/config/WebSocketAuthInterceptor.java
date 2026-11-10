package com.taskflow.config;

import com.taskflow.notifications.NotificationService;
import com.taskflow.security.AppUserDetailsService;
import com.taskflow.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/**
 * Authentifie la connexion STOMP puis restreint ce qu'une session peut faire :
 * le seul abonnement autorisé est la file personnelle de notifications. Sans cela, le broker simple
 * accepte des motifs (ex : /queue/**) qui permettraient de lire les notifications de tous les utilisateurs.
 *
 * Un navigateur est authentifié dès la poignée de main HTTP par son cookie de session ; un client d'API
 * peut à la place envoyer le header STOMP {@code Authorization: Bearer <jwt>} au CONNECT.
 */
@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final String ALLOWED_SUBSCRIPTION = "/user" + NotificationService.USER_QUEUE;

    private final JwtService jwtService;
    private final AppUserDetailsService userDetailsService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) return message; // heartbeat

        switch (accessor.getCommand()) {
            case CONNECT, STOMP -> {
                if (accessor.getUser() != null) break; // déjà authentifié par le cookie lors de la poignée de main
                String header = accessor.getFirstNativeHeader("Authorization");
                if (header == null || !header.startsWith("Bearer ")) {
                    throw new MessagingException("Non authentifié");
                }
                accessor.setUser(userDetailsService.authenticate(jwtService.parse(header.substring(7)))
                        .orElseThrow(() -> new MessagingException("Token invalide")));
            }
            case SUBSCRIBE -> {
                if (accessor.getUser() == null) throw new MessagingException("Non authentifié");
                if (!ALLOWED_SUBSCRIPTION.equals(accessor.getDestination())) {
                    throw new MessagingException("Abonnement non autorisé");
                }
            }
            // Le client n'a aucun message applicatif à envoyer : les notifications sont poussées par le serveur.
            case SEND, BEGIN, COMMIT, ABORT, ACK, NACK -> throw new MessagingException("Commande non autorisée");
            default -> {
                // DISCONNECT, UNSUBSCRIBE : autorisés
            }
        }
        return message;
    }
}
