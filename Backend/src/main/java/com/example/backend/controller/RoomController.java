package com.example.backend.controller;

import com.example.backend.domain.model.GameRoom;
import com.example.backend.domain.model.Player;
import com.example.backend.dto.PlayerViewDTO;
import com.example.backend.service.GameStateMaskerService;
import com.example.backend.service.RoomService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Room Management", description = "APIs for creating rooms, joining rooms, and retrieving game state")
@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomController {

    private final RoomService roomService;
    private final GameStateMaskerService maskerService;

    public RoomController(RoomService roomService, GameStateMaskerService maskerService) {
        this.roomService = roomService;
        this.maskerService = maskerService;
    }

    public record CreateRoomRequest(@NotBlank String nickname, @NotBlank String sessionToken) {}
    public record JoinRoomRequest(@NotBlank String roomCode, @NotBlank String nickname, @NotBlank String sessionToken) {}
    public record RoomResponse(String roomCode, PlayerViewDTO gameState) {}

    @PostMapping("/create")
    public ResponseEntity<RoomResponse> createRoom(@Valid @RequestBody CreateRoomRequest request) {
        GameRoom room = roomService.createRoom(request.nickname(), request.sessionToken());
        Player host = room.getPlayerOrThrow(room.getCurrentPresidentId() == null ? room.getPlayers().get(0).getId() : room.getCurrentPresidentId());

        PlayerViewDTO maskedState = maskerService.maskStateForPlayer(room, host);
        return ResponseEntity.ok(new RoomResponse(room.getRoomCode(), maskedState));
    }

    @PostMapping("/join")
    public ResponseEntity<RoomResponse> joinRoom(@Valid @RequestBody JoinRoomRequest request) {
        GameRoom room = roomService.joinRoom(request.roomCode(), request.nickname(), request.sessionToken());
        Player joinedPlayer = room.findBySessionToken(request.sessionToken()).orElseThrow();

        PlayerViewDTO maskedState = maskerService.maskStateForPlayer(room, joinedPlayer);
        return ResponseEntity.ok(new RoomResponse(room.getRoomCode(), maskedState));
    }

    @GetMapping("/{roomCode}/state")
    public ResponseEntity<PlayerViewDTO> getRoomState(
            @PathVariable String roomCode,
            @RequestHeader("X-Session-Token") String sessionToken) {

        GameRoom room = roomService.getRoomOrThrow(roomCode);
        Player player = room.findBySessionToken(sessionToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid session token"));

        return ResponseEntity.ok(maskerService.maskStateForPlayer(room, player));
    }
}