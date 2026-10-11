package com.example.backend.service;

import com.example.backend.domain.enums.Phase;
import com.example.backend.domain.enums.PolicyType;
import com.example.backend.domain.enums.Role;
import com.example.backend.domain.enums.Vote;
import com.example.backend.domain.enums.Winner;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.domain.model.Player;
import com.example.backend.service.impl.GameEngineServiceImpl;
import com.example.backend.service.impl.RoomServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FullGameSimulationTest {

    private RoomService roomService;
    private GameEngineService gameEngineService;

    @BeforeEach
    void setUp() {
        roomService = new RoomServiceImpl();
        gameEngineService = new GameEngineServiceImpl();
    }

    private GameRoom setupRoomWith5Players() {
        GameRoom room = roomService.createRoom("HostPlayer", "token-1");
        for (int i = 2; i <= 5; i++) {
            roomService.joinRoom(room.getRoomCode(), "Player" + i, "token-" + i);
        }
        return room;
    }

    @Test
    void simulateFullGame_LiberalVictoryByPolicies() {
        GameRoom room = setupRoomWith5Players();

        // Host starts the game
        gameEngineService.startGame(room, "token-1");

        // Force the entire draw deck to be LIBERAL to guarantee a predictable 5-round win
        room.getDrawDeck().clear();
        for (int i = 0; i < 20; i++) {
            room.getDrawDeck().add(PolicyType.LIBERAL);
        }

        // Play exactly 5 rounds
        for (int round = 1; round <= 5; round++) {
            Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
            Player chancellor = gameEngineService.getEligibleChancellors(room).getFirst();

            // 1. Nomination Phase
            gameEngineService.nominateChancellor(room, president.getSessionToken(), chancellor.getId());

            // 2. Voting Phase (Everyone votes JA)
            for (Player p : room.getAlivePlayers()) {
                gameEngineService.castVote(room, p.getSessionToken(), Vote.JA);
            }

            // 3. Legislative Phase - President discards 1 card
            gameEngineService.presidentDiscardPolicy(room, president.getSessionToken(), 0);

            // 4. Legislative Phase - Chancellor enacts 1 card
            gameEngineService.chancellorEnactPolicy(room, chancellor.getSessionToken(), 0);
        }

        // Assert game ended correctly with Liberal victory
        assertEquals(Phase.GAME_OVER, room.getCurrentPhase());
        assertEquals(Winner.LIBERAL, room.getWinner());
        assertEquals(5, room.getEnactedLiberalPolicies());
    }

    @Test
    void simulateFullGame_FascistVictoryByHitlerElection() {
        GameRoom room = setupRoomWith5Players();
        gameEngineService.startGame(room, "token-1");

        // Force the entire draw deck to be FASCIST for the first 3 rounds
        room.getDrawDeck().clear();
        for (int i = 0; i < 20; i++) {
            room.getDrawDeck().add(PolicyType.FASCIST);
        }

        // Play 3 rounds to enact 3 Fascist policies and enter the "Hitler Zone"
        for (int round = 1; round <= 3; round++) {
            Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
            Player chancellor = gameEngineService.getEligibleChancellors(room).stream()
                    // Intentionally avoid electing Hitler early to prevent premature game over
                    .filter(p -> p.getRole() != Role.HITLER)
                    .findFirst()
                    .orElseThrow();

            gameEngineService.nominateChancellor(room, president.getSessionToken(), chancellor.getId());
            for (Player p : room.getAlivePlayers()) {
                gameEngineService.castVote(room, p.getSessionToken(), Vote.JA);
            }

            gameEngineService.presidentDiscardPolicy(room, president.getSessionToken(), 0);
            gameEngineService.chancellorEnactPolicy(room, chancellor.getSessionToken(), 0);

            // If the 3rd Fascist policy triggers a Policy Peek, end the action to continue
            if (room.getCurrentPhase() == Phase.EXECUTIVE_ACTION) {
                gameEngineService.endExecutiveAction(room, president.getSessionToken());
            }
        }

        // Verify we are in the Hitler Zone
        assertEquals(3, room.getEnactedFascistPolicies());
        assertEquals(Phase.NOMINATION, room.getCurrentPhase());

        // Round 4: Nominate Hitler as Chancellor to trigger immediate Fascist win
        Player president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        Player hitler = room.getPlayers().stream()
                .filter(p -> p.getRole() == Role.HITLER)
                .findFirst()
                .orElseThrow();

        // If president happens to be Hitler, advance turn to ensure valid nomination
        if (president.getId().equals(hitler.getId())) {
            gameEngineService.advanceToNextPresident(room);
            president = room.getPlayerOrThrow(room.getCurrentPresidentId());
        }

        gameEngineService.nominateChancellor(room, president.getSessionToken(), hitler.getId());

        // All players vote JA for Hitler
        for (Player p : room.getAlivePlayers()) {
            gameEngineService.castVote(room, p.getSessionToken(), Vote.JA);
        }

        // Assert game ended immediately after successful election without entering legislative phase
        assertEquals(Phase.GAME_OVER, room.getCurrentPhase());
        assertEquals(Winner.FASCIST, room.getWinner());
    }
}