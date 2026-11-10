package com.taskflow;

import com.taskflow.config.WebSocketAuthInterceptor;
import com.taskflow.security.JwtService;
import com.taskflow.users.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.security.Principal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/** Une session STOMP ne peut s'abonner qu'à sa propre file de notifications. */
@SpringBootTest
class WebSocketSecurityTest {

    @Autowired
    WebSocketAuthInterceptor interceptor;

    @Autowired
    JwtService jwtService;

    @Autowired
    UserRepository users;

    private static final Principal USER = new UsernamePasswordAuthenticationToken("1", null, List.of());

    private Message<byte[]> frame(StompCommand command, String destination, Principal user, String authorization) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setLeaveMutable(true);
        if (destination != null) accessor.setDestination(destination);
        if (user != null) accessor.setUser(user);
        if (authorization != null) accessor.setNativeHeader("Authorization", authorization);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void connectRequiresAValidToken() {
        assertThrows(MessagingException.class, () -> interceptor.preSend(frame(StompCommand.CONNECT, null, null, null), null));
        assertThrows(MessagingException.class,
                () -> interceptor.preSend(frame(StompCommand.CONNECT, null, null, "Bearer not-a-token"), null));

        var manager = users.findByEmailIgnoreCase("manager@taskflow.com").orElseThrow();
        Message<?> connected = interceptor.preSend(
                frame(StompCommand.CONNECT, null, null, "Bearer " + jwtService.generateToken(manager)), null);
        Principal principal = StompHeaderAccessor.wrap(connected).getUser();
        assertNotNull(principal);
        assertEquals(String.valueOf(manager.getId()), principal.getName());
    }

    @Test
    void onlyThePersonalNotificationQueueCanBeSubscribed() {
        assertDoesNotThrow(() -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/user/queue/notifications", USER, null), null));

        // Motifs acceptés par le broker simple : ils donneraient accès aux notifications de tous les utilisateurs
        for (String destination : List.of("/queue/**", "/queue/notifications-user*", "/topic/**", "/user/queue/**")) {
            assertThrows(MessagingException.class,
                    () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, destination, USER, null), null), destination);
        }
    }

    @Test
    void unauthenticatedSessionsCannotSubscribeAndNobodyCanSend() {
        assertThrows(MessagingException.class,
                () -> interceptor.preSend(frame(StompCommand.SUBSCRIBE, "/user/queue/notifications", null, null), null));
        assertThrows(MessagingException.class,
                () -> interceptor.preSend(frame(StompCommand.SEND, "/queue/notifications-user123", USER, null), null));
    }
}
