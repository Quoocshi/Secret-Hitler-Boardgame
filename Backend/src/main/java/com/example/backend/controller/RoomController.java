package com.example.backend.controller;

import com.example.backend.domain.model.GameRoom;
import com.example.backend.domain.model.Player;
import com.example.backend.dto.PlayerViewDTO;
import com.example.backend.service.GameStateMaskerService;
import com.example.backend.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Room Management", description = "APIs for creating rooms, joining rooms, and retrieving game state")
@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomController {

    private final RoomService roomService;
    private final GameStateMaskerService maskerService;
    private final SimpMessagingTemplate messagingTemplate;

    public RoomController(
            RoomService roomService,
            GameStateMaskerService maskerService,
            SimpMessagingTemplate messagingTemplate) {
        this.roomService = roomService;
        this.maskerService = maskerService;
        this.messagingTemplate = messagingTemplate;
    }

    public record CreateRoomRequest(@NotBlank String nickname, @NotBlank String sessionToken) {}
    public record JoinRoomRequest(@NotBlank String roomCode, @NotBlank String nickname, @NotBlank String sessionToken) {}
    public record RoomResponse(String roomCode, PlayerViewDTO gameState) {}

    @Operation(summary = "Create a new room", description = "Host creates a room using their nickname and a random sessionToken.")
    @PostMapping("/create")
    public ResponseEntity<RoomResponse> createRoom(@Valid @RequestBody CreateRoomRequest request) {
        GameRoom room = roomService.createRoom(request.nickname(), request.sessionToken());
        Player host = room.findBySessionToken(request.sessionToken()).orElseThrow();

        PlayerViewDTO maskedState = maskerService.maskStateForPlayer(room, host);
        return ResponseEntity.ok(new RoomResponse(room.getRoomCode(), maskedState));
    }

    @Operation(summary = "Join an existing room", description = "Player joins the game using a roomCode, nickname, and sessionToken. Broadcasts updated lobby state to all connected members.")
    @PostMapping("/join")
    public ResponseEntity<RoomResponse> joinRoom(@Valid @RequestBody JoinRoomRequest request) {
        GameRoom room = roomService.joinRoom(request.roomCode(), request.nickname(), request.sessionToken());
        Player joinedPlayer = room.findBySessionToken(request.sessionToken()).orElseThrow();

        // Broadcast updated player list to everyone already waiting in the room
        broadcastMaskedState(room);

        PlayerViewDTO maskedState = maskerService.maskStateForPlayer(room, joinedPlayer);
        return ResponseEntity.ok(new RoomResponse(room.getRoomCode(), maskedState));
    }

    @Operation(summary = "Get current game state (F5 / Reconnect)", description = "Fetches the latest masked game state snapshot.")
    @GetMapping("/{roomCode}/state")
    public ResponseEntity<PlayerViewDTO> getRoomState(
            @Parameter(description = "Room code (6 characters)", example = "ABCDEF")
            @PathVariable String roomCode,
            @Parameter(description = "Secret session token stored in localStorage", example = "uuid-token-string")
            @RequestHeader("X-Session-Token") String sessionToken) {

        GameRoom room = roomService.getRoomOrThrow(roomCode);
        Player player = room.findBySessionToken(sessionToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid session token"));

        return ResponseEntity.ok(maskerService.maskStateForPlayer(room, player));
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