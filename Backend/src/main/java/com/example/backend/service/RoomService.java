package com.example.backend.service;

import com.example.backend.domain.model.GameRoom;
import java.time.Duration;

public interface RoomService {

    // Generates a unique room code, initializes the lobby, and registers the caller as the room host
    GameRoom createRoom(String hostNickname, String sessionToken);

    // Adds a player to a lobby or reconnects an existing player using their session token
    GameRoom joinRoom(String roomCode, String nickname, String sessionToken);

    // Marks a player as disconnected and automatically transfers host status if in lobby phase
    void handleDisconnectOrLeave(String roomCode, String sessionToken);

    // Retrieves an active room by code or throws GameException if not found
    GameRoom getRoomOrThrow(String roomCode);

    // Removes rooms that have had no user interaction past the allowed idle duration threshold
    int cleanupInactiveRooms(Duration maxIdleDuration);

    // Allows the host to kick a specific player from the room (aborts game if players drop below minimum)
    void kickPlayer(String roomCode, String hostSessionToken, String targetPlayerId);

    // Allows a player to voluntarily leave the room completely
    void leaveRoom(String roomCode, String sessionToken);
}