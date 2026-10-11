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
        assertFalse(reconnectedRoom.findBySessionToken("token-p2-456").orElseThrow().isConnected(), "REST rejoin must not claim socket presence");

        assertThrows(GameException.class, () ->
                roomManager.joinRoom(room.getRoomCode(), "Stranger", "token-stranger-999")
        );
    }

    @Test
    void shouldTransferHostWhenHostDisconnectsInLobby() {
        GameRoom room = roomManager.createRoom("HuyHost", "token-host");
        roomManager.joinRoom(room.getRoomCode(), "Player2", "token-p2");
        room.findBySessionToken("token-host").orElseThrow().setConnected(true);
        room.findBySessionToken("token-p2").orElseThrow().setConnected(true);

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
    @Test void restMembershipStartsOfflineAndVersionsChangeOnlyForMutations() {
        var room=roomManager.createRoom("  An  ","an");
        assertEquals("An",room.getPlayers().getFirst().getNickname());
        assertFalse(room.getPlayers().getFirst().isConnected());
        long before=room.getStateVersion();
        roomManager.joinRoom(room.getRoomCode(),"Bình","binh");
        assertEquals(before+1,room.getStateVersion());
        assertFalse(room.getPlayers().getLast().isConnected());
        before=room.getStateVersion();
        roomManager.joinRoom(room.getRoomCode()," An ","an");
        assertEquals(before,room.getStateVersion());
    }
    @Test void rejoinChecksNamesCaseInsensitivelyAndExcludesSelf() {
        var room=roomManager.createRoom("An","an");
        roomManager.joinRoom(room.getRoomCode(),"Binh","binh");
        assertDoesNotThrow(()->roomManager.joinRoom(room.getRoomCode()," an ","an"));
        var error=assertThrows(GameException.class,()->roomManager.joinRoom(room.getRoomCode()," BINH ","an"));
        assertEquals("NICKNAME_DUPLICATED",error.getCode());
        assertEquals("an",room.getPlayers().getFirst().getNickname());
    }
    @Test void fullAndStartedRoomsHaveStableConflictCodes() {
        var room=roomManager.createRoom("P0","t0");
        for(int i=1;i<10;i++)roomManager.joinRoom(room.getRoomCode(),"P"+i,"t"+i);
        assertEquals("ROOM_FULL",assertThrows(GameException.class,()->roomManager.joinRoom(room.getRoomCode(),"P10","t10")).getCode());
        room.setCurrentPhase(Phase.NOMINATION);
        assertEquals("ROOM_STARTED",assertThrows(GameException.class,()->roomManager.joinRoom(room.getRoomCode(),"P11","t11")).getCode());
        assertDoesNotThrow(()->roomManager.joinRoom(room.getRoomCode(),"P0","t0"));
    }
}
