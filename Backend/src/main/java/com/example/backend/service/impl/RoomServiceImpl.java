package com.example.backend.service.impl;

import com.example.backend.constants.GameConstants;
import com.example.backend.domain.enums.Phase;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.domain.model.Player;
import com.example.backend.exception.GameException;
import com.example.backend.service.RoomService;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomServiceImpl implements RoomService {

    private final SecureRandom random = new SecureRandom();
    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();

    @Override
    public GameRoom createRoom(String hostNickname, String sessionToken) {
        validateInputs(hostNickname, sessionToken);

        String roomCode = generateUniqueRoomCode();
        GameRoom room = new GameRoom(roomCode);

        Player host = Player.builder()
                .id(UUID.randomUUID().toString())
                .sessionToken(sessionToken)
                .nickname(hostNickname.trim())
                .isHost(true)
                .build();

        room.getPlayers().add(host);
        room.addLog(String.format(GameConstants.LogMessage.ROOM_CREATED, host.getNickname()));
        rooms.put(roomCode, room);

        return room;
    }

    @Override
    public GameRoom joinRoom(String roomCode, String nickname, String sessionToken) {
        validateInputs(nickname, sessionToken);
        String normalizedCode = roomCode.trim().toUpperCase();

        GameRoom room = getRoomOrThrow(normalizedCode);

        synchronized (room) {
            Optional<Player> existingPlayerOpt = room.findBySessionToken(sessionToken);
            if (existingPlayerOpt.isPresent()) {
                Player existingPlayer = existingPlayerOpt.get();
                existingPlayer.setConnected(true);
                if (room.getCurrentPhase() == Phase.LOBBY) {
                    existingPlayer.setNickname(nickname.trim());
                }
                room.touchActivity();
                return room;
            }

            if (room.getCurrentPhase() != Phase.LOBBY) {
                throw new GameException(GameConstants.ErrorMessage.ROOM_ALREADY_STARTED);
            }

            if (room.getPlayers().size() >= GameConstants.Room.MAX_PLAYERS) {
                throw new GameException(String.format(GameConstants.ErrorMessage.ROOM_FULL, GameConstants.Room.MAX_PLAYERS));
            }

            boolean duplicateName = room.getPlayers().stream()
                    .anyMatch(p -> p.getNickname().equalsIgnoreCase(nickname.trim()));
            if (duplicateName) {
                throw new GameException(String.format(GameConstants.ErrorMessage.NICKNAME_DUPLICATED, nickname));
            }

            Player newPlayer = Player.builder()
                    .id(UUID.randomUUID().toString())
                    .sessionToken(sessionToken)
                    .nickname(nickname.trim())
                    .build();

            room.getPlayers().add(newPlayer);
            room.addLog(String.format(GameConstants.LogMessage.PLAYER_JOINED, newPlayer.getNickname()));
            return room;
        }
    }

    @Override
    public void handleDisconnectOrLeave(String roomCode, String sessionToken) {
        GameRoom room = rooms.get(roomCode.toUpperCase());
        if (room == null) return;

        synchronized (room) {
            Optional<Player> playerOpt = room.findBySessionToken(sessionToken);
            if (playerOpt.isEmpty()) return;

            Player player = playerOpt.get();
            player.setConnected(false);
            room.touchActivity();

            if (room.getCurrentPhase() == Phase.LOBBY && player.isHost()) {
                room.getPlayers().stream()
                        .filter(Player::isConnected)
                        .findFirst()
                        .ifPresent(nextHost -> {
                            player.setHost(false);
                            nextHost.setHost(true);
                            room.addLog(String.format(GameConstants.LogMessage.NEW_HOST, nextHost.getNickname()));
                        });
            }
        }
    }

    @Override
    public GameRoom getRoomOrThrow(String roomCode) {
        if (roomCode == null || roomCode.isBlank()) {
            throw new GameException(GameConstants.ErrorMessage.ROOM_INVALID_CODE);
        }
        GameRoom room = rooms.get(roomCode.trim().toUpperCase());
        if (room == null) {
            throw new GameException(String.format(GameConstants.ErrorMessage.ROOM_NOT_FOUND, roomCode));
        }
        return room;
    }

    @Override
    public int cleanupInactiveRooms(Duration maxIdleDuration) {
        Instant threshold = Instant.now().minus(maxIdleDuration);
        int removedCount = 0;
        for (Map.Entry<String, GameRoom> entry : rooms.entrySet()) {
            if (entry.getValue().getLastActivityAt().isBefore(threshold)) {
                rooms.remove(entry.getKey());
                removedCount++;
            }
        }
        return removedCount;
    }

    private String generateUniqueRoomCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder(GameConstants.Room.ROOM_CODE_LENGTH);
            for (int i = 0; i < GameConstants.Room.ROOM_CODE_LENGTH; i++) {
                sb.append(GameConstants.Room.ROOM_CODE_CHARS.charAt(random.nextInt(GameConstants.Room.ROOM_CODE_CHARS.length())));
            }
            code = sb.toString();
        } while (rooms.containsKey(code));
        return code;
    }

    private void validateInputs(String nickname, String sessionToken) {
        if (nickname == null || nickname.trim().isEmpty()) {
            throw new GameException(GameConstants.ErrorMessage.NICKNAME_EMPTY);
        }
        if (sessionToken == null || sessionToken.trim().isEmpty()) {
            throw new GameException(GameConstants.ErrorMessage.SESSION_TOKEN_INVALID);
        }
    }
}