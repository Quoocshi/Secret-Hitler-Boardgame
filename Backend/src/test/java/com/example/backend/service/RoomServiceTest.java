package com.example.backend.service;

import com.example.backend.domain.enums.Phase;
import com.example.backend.domain.enums.PolicyType;
import com.example.backend.domain.enums.Role;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.exception.GameException;
import com.example.backend.service.impl.RoomServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RoomServiceTest {

    private RoomServiceImpl roomManager;

    @BeforeEach
    void setUp() {
        roomManager = new RoomServiceImpl();
    }

    @Test
    void shouldCreateAndJoinRoomSuccessfully() {
        GameRoom room = roomManager.createRoom("HuyHost", "token-host-123");
        assertNotNull(room.getRoomCode());
        assertEquals(6, room.getRoomCode().length());
        assertEquals(1, room.getPlayers().size());
        assertTrue(room.getPlayers().getFirst().isHost());

        roomManager.joinRoom(room.getRoomCode(), "Player2", "token-p2-456");
        assertEquals(2, room.getPlayers().size());
    }

    @Test
    void shouldAllowReconnectEvenWhenGameStarted() {
        GameRoom room = roomManager.createRoom("HuyHost", "token-host-123");
        roomManager.joinRoom(room.getRoomCode(), "Player2", "token-p2-456");

        room.setCurrentPhase(Phase.VOTING);
        room.findBySessionToken("token-p2-456").ifPresent(p -> p.setConnected(false));

        GameRoom reconnectedRoom = roomManager.joinRoom(room.getRoomCode(), "Player2", "token-p2-456");
        assertTrue(reconnectedRoom.findBySessionToken("token-p2-456").orElseThrow().isConnected());

        assertThrows(GameException.class, () ->
                roomManager.joinRoom(room.getRoomCode(), "Stranger", "token-stranger-999")
        );
    }

    @Test
    void shouldTransferHostWhenHostDisconnectsInLobby() {
        GameRoom room = roomManager.createRoom("HuyHost", "token-host");
        roomManager.joinRoom(room.getRoomCode(), "Player2", "token-p2");

        roomManager.handleDisconnectOrLeave(room.getRoomCode(), "token-host");

        assertFalse(room.findBySessionToken("token-host").orElseThrow().isHost());
        assertTrue(room.findBySessionToken("token-p2").orElseThrow().isHost());
    }

    @Test
    void hitlerPartyMembershipShouldBeFascist() {
        assertEquals(PolicyType.FASCIST, Role.HITLER.getPartyMembership());
        assertEquals(PolicyType.FASCIST, Role.FASCIST.getPartyMembership());
        assertEquals(PolicyType.LIBERAL, Role.LIBERAL.getPartyMembership());
    }
}