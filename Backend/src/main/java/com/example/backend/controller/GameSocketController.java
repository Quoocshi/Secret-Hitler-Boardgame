package com.example.backend.controller;

import com.example.backend.domain.enums.Vote;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.domain.model.Player;
import com.example.backend.dto.PlayerViewDTO;
import com.example.backend.dto.WebRtcSignalMessage;
import com.example.backend.exception.GameException;
import com.example.backend.service.GameEngineService;
import com.example.backend.service.GameStateMaskerService;
import com.example.backend.service.RoomService;
import org.springframework.messaging.Message;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.time.Instant;

@Controller
public class GameSocketController {

    private final GameEngineService gameEngineService;
    private final RoomService roomService;
    private final GameStateMaskerService maskerService;
    private final SimpMessagingTemplate messagingTemplate;

    public GameSocketController(
            GameEngineService gameEngineService,
            RoomService roomService,
            GameStateMaskerService maskerService,
            SimpMessagingTemplate messagingTemplate) {
        this.gameEngineService = gameEngineService;
        this.roomService = roomService;
        this.maskerService = maskerService;
        this.messagingTemplate = messagingTemplate;
    }

    // Prevents STOMP connection drops on rule violations by routing errors to a private error queue
    public record SocketErrorPayload(String error, String message, Instant timestamp) {}

    @MessageExceptionHandler(Exception.class)
    public void handleSocketException(Exception ex, Message<?> message) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        String sessionToken = accessor.getFirstNativeHeader("X-Session-Token");

        if (sessionToken != null) {
            String errorType = (ex instanceof GameException) ? "GAME_RULE_VIOLATION" : "INVALID_REQUEST";
            SocketErrorPayload errorPayload = new SocketErrorPayload(errorType, ex.getMessage(), Instant.now());
            messagingTemplate.convertAndSend("/queue/errors/" + sessionToken, errorPayload);
        }
    }

    @MessageMapping("/room/{roomCode}/signal")
    public void handleWebRtcSignal(
            @DestinationVariable String roomCode,
            @Payload WebRtcSignalMessage signalMessage) {

        // Relays the signal strictly to the targeted player's private queue
        String destination = String.format("/queue/room/%s/signal/%s", roomCode, signalMessage.targetId());
        messagingTemplate.convertAndSend(destination, signalMessage);
    }

    @MessageMapping("/room/{roomCode}/start")
    public void startGame(@DestinationVariable String roomCode, @Header("simpSessionId") String wsSessionId, @Header("X-Session-Token") String sessionToken) {
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        gameEngineService.startGame(room, sessionToken);
        broadcastMaskedState(room);
    }

    @MessageMapping("/room/{roomCode}/restart")
    public void restartGame(
            @DestinationVariable String roomCode,
            @Header("X-Session-Token") String sessionToken) {
        // Resets the finished game back to the lobby phase for a rematch
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        gameEngineService.resetToLobby(room, sessionToken);
        broadcastMaskedState(room);
    }

    // Record for standard single-target actions (nomination, execution, investigation)
    public record TargetActionPayload(String targetPlayerId) {}

    @MessageMapping("/room/{roomCode}/nominate")
    public void nominateChancellor(
            @DestinationVariable String roomCode,
            @Header("X-Session-Token") String sessionToken,
            @Payload TargetActionPayload payload) {
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        gameEngineService.nominateChancellor(room, sessionToken, payload.targetPlayerId());
        broadcastMaskedState(room);
    }

    // Record for voting (JA/NEIN)
    public record VotePayload(Vote vote) {}

    @MessageMapping("/room/{roomCode}/vote")
    public void castVote(
            @DestinationVariable String roomCode,
            @Header("X-Session-Token") String sessionToken,
            @Payload VotePayload payload) {
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        gameEngineService.castVote(room, sessionToken, payload.vote());
        broadcastMaskedState(room);
    }

    private void broadcastMaskedState(GameRoom room) {
        for (Player player : room.getPlayers()) {
            if (player.isConnected()) {
                PlayerViewDTO maskedView = maskerService.maskStateForPlayer(room, player);
                // Send directly to this specific user's private queue
                String destination = String.format("/queue/room/%s/state/%s", room.getRoomCode(), player.getSessionToken());
                messagingTemplate.convertAndSend(destination, maskedView);
            }
        }
    }

    public record PolicyIndexPayload(int policyIndex) {}

    @MessageMapping("/room/{roomCode}/discard")
    public void presidentDiscard(
            @DestinationVariable String roomCode,
            @Header("X-Session-Token") String sessionToken,
            @Payload PolicyIndexPayload payload) {
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        gameEngineService.presidentDiscardPolicy(room, sessionToken, payload.policyIndex());
        broadcastMaskedState(room);
    }

    @MessageMapping("/room/{roomCode}/enact")
    public void chancellorEnact(
            @DestinationVariable String roomCode,
            @Header("X-Session-Token") String sessionToken,
            @Payload PolicyIndexPayload payload) {
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        gameEngineService.chancellorEnactPolicy(room, sessionToken, payload.policyIndex());
        broadcastMaskedState(room);
    }

    @MessageMapping("/room/{roomCode}/veto/request")
    public void requestVeto(
            @DestinationVariable String roomCode,
            @Header("X-Session-Token") String sessionToken) {
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        gameEngineService.chancellorRequestVeto(room, sessionToken);
        broadcastMaskedState(room);
    }

    public record VetoResponsePayload(boolean approve) {}

    @MessageMapping("/room/{roomCode}/veto/response")
    public void respondToVeto(
            @DestinationVariable String roomCode,
            @Header("X-Session-Token") String sessionToken,
            @Payload VetoResponsePayload payload) {
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        gameEngineService.presidentRespondToVeto(room, sessionToken, payload.approve());
        broadcastMaskedState(room);
    }

    @MessageMapping("/room/{roomCode}/execute")
    public void executePlayer(
            @DestinationVariable String roomCode,
            @Header("X-Session-Token") String sessionToken,
            @Payload TargetActionPayload payload) {
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        gameEngineService.executePlayer(room, sessionToken, payload.targetPlayerId());
        broadcastMaskedState(room);
    }

    @MessageMapping("/room/{roomCode}/investigate")
    public void investigatePlayer(
            @DestinationVariable String roomCode,
            @Header("X-Session-Token") String sessionToken,
            @Payload TargetActionPayload payload) {
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        gameEngineService.investigatePlayer(room, sessionToken, payload.targetPlayerId());
        broadcastMaskedState(room);
    }

    @MessageMapping("/room/{roomCode}/special-election")
    public void callSpecialElection(
            @DestinationVariable String roomCode,
            @Header("X-Session-Token") String sessionToken,
            @Payload TargetActionPayload payload) {
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        gameEngineService.callSpecialElection(room, sessionToken, payload.targetPlayerId());
        broadcastMaskedState(room);
    }

    @MessageMapping("/room/{roomCode}/end-action")
    public void endExecutiveAction(
            @DestinationVariable String roomCode,
            @Header("X-Session-Token") String sessionToken) {
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        gameEngineService.endExecutiveAction(room, sessionToken);
        broadcastMaskedState(room);
    }

    @MessageMapping("/room/{roomCode}/kick")
    public void kickPlayer(
            @DestinationVariable String roomCode,
            @Header("X-Session-Token") String sessionToken,
            @Payload TargetActionPayload payload) {
        // Only the host can kick (verified in RoomService)
        roomService.kickPlayer(roomCode, sessionToken, payload.targetPlayerId());
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        broadcastMaskedState(room);
    }

    @MessageMapping("/room/{roomCode}/leave")
    public void leaveRoom(
            @DestinationVariable String roomCode,
            @Header("X-Session-Token") String sessionToken) {
        // Any player can choose to leave the room
        roomService.leaveRoom(roomCode, sessionToken);
        GameRoom room = roomService.getRoomOrThrow(roomCode);
        broadcastMaskedState(room);
    }
}