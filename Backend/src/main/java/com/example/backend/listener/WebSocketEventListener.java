package com.example.backend.listener;

import com.example.backend.domain.model.GameRoom;
import com.example.backend.domain.model.Player;
import com.example.backend.dto.PlayerViewDTO;
import com.example.backend.service.GameStateMaskerService;
import com.example.backend.service.RoomService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketEventListener {

    private final RoomService roomService;
    private final GameStateMaskerService maskerService;
    private final SimpMessagingTemplate messagingTemplate;

    // Maps WebSocket sessionId to SessionInfo record (roomCode, sessionToken)
    private final Map<String, SessionInfo> sessionMap = new ConcurrentHashMap<>();

    public WebSocketEventListener(
            RoomService roomService,
            GameStateMaskerService maskerService,
            SimpMessagingTemplate messagingTemplate) {
        this.roomService = roomService;
        this.maskerService = maskerService;
        this.messagingTemplate = messagingTemplate;
    }

    public record SessionInfo(String roomCode, String sessionToken) {}

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        String sessionToken = accessor.getFirstNativeHeader("X-Session-Token");
        String roomCode = accessor.getFirstNativeHeader("Room-Code");
        String sessionId = accessor.getSessionId();

        if (sessionToken != null && roomCode != null && sessionId != null) {
            sessionMap.put(sessionId, new SessionInfo(roomCode, sessionToken));

            // Mark player as connected and notify everyone in the room upon reconnect
            try {
                GameRoom room = roomService.getRoomOrThrow(roomCode);
                synchronized (room) {
                    room.findBySessionToken(sessionToken).ifPresent(player -> {
                        player.setConnected(true);
                        room.touchActivity();
                    });
                }
                broadcastMaskedState(room);
            } catch (Exception ignored) {
                // Room may not exist yet
            }
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();

        SessionInfo info = sessionMap.remove(sessionId);
        if (info != null) {
            roomService.handleDisconnectOrLeave(info.roomCode(), info.sessionToken());

            try {
                GameRoom room = roomService.getRoomOrThrow(info.roomCode());
                broadcastMaskedState(room);
            } catch (Exception ignored) {
                // Room might have been cleaned up or no longer exists
            }
        }
    }

    private void broadcastMaskedState(GameRoom room) {
        for (Player player : room.getPlayers()) {
            if (player.isConnected()) {
                PlayerViewDTO maskedView = maskerService.maskStateForPlayer(room, player);
                String destination = String.format("/queue/room/%s/state/%s", room.getRoomCode(), player.getSessionToken());
                messagingTemplate.convertAndSend(destination, maskedView);
            }
        }
    }
}