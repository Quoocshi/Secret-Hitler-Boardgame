package com.example.backend.domain.model;

import com.example.backend.domain.enums.*;
import com.example.backend.exception.GameException;
import lombok.Data;
import com.example.backend.dto.ActionResultDTO;
import com.example.backend.dto.InvestigationResultDTO;

import java.time.Instant;
import java.util.*;

@Data
public class GameRoom {
    public static final int MIN_PLAYERS = 5;
    public static final int MAX_PLAYERS = 10;

    private final String roomCode;
    private final Instant createdAt = Instant.now();
    private Instant lastActivityAt = Instant.now();

    private Phase currentPhase = Phase.LOBBY;
    private long stateVersion = 0;
    private final Map<String, List<InvestigationResultDTO>> investigationResults = new HashMap<>();
    private final Map<String, CachedAction> actionResults = new HashMap<>();
    public record CachedAction(String fingerprint, ActionResultDTO result) {}
    public void commitMutation() { stateVersion++; touchActivity(); }

    private final List<Player> players = new ArrayList<>();

    private int presidentIndex = 0;
    private Integer returnToPresidentIndexAfterSpecial = null;
    private String currentPresidentId;
    private String currentChancellorId;
    private String nominatedChancellorId;

    private String lastElectedPresidentId;
    private String lastElectedChancellorId;

    private int electionTracker = 0;
    private final Map<String, Vote> currentVotes = new HashMap<>();
    private final Map<String, Vote> lastRevealedVotes = new HashMap<>();

    private final List<PolicyType> drawDeck = new ArrayList<>();
    private final List<PolicyType> discardDeck = new ArrayList<>();
    private final List<PolicyType> handPolicies = new ArrayList<>();

    private int enactedLiberalPolicies = 0;
    private int enactedFascistPolicies = 0;
    private boolean vetoRequestedThisRound = false;

    private ExecutiveAction pendingExecutiveAction = ExecutiveAction.NONE;
    private Winner winner = Winner.NONE;
    private String winReason;

    private final List<String> gameLogs = new ArrayList<>();

    public GameRoom(String roomCode) {
        this.roomCode = roomCode;
    }

    public void touchActivity() {
        this.lastActivityAt = Instant.now();
    }

    public void addLog(String message) {
        this.gameLogs.add(message);
        touchActivity();
    }

    public Optional<Player> findByPlayerId(String playerId) {
        return players.stream()
                .filter(p -> p.getId().equals(playerId))
                .findFirst();
    }

    public Player getPlayerOrThrow(String playerId) {
        return findByPlayerId(playerId)
                .orElseThrow(() -> new GameException("Không tìm thấy người chơi trong phòng: " + playerId));
    }

    public Optional<Player> findBySessionToken(String sessionToken) {
        return players.stream()
                .filter(p -> p.getSessionToken().equals(sessionToken))
                .findFirst();
    }

    public List<Player> getAlivePlayers() {
        return players.stream()
                .filter(Player::isAlive)
                .toList();
    }

    public int getAlivePlayerCount() {
        return (int) players.stream().filter(Player::isAlive).count();
    }

    public boolean isVetoPowerUnlocked() {
        return enactedFascistPolicies >= 5;
    }
}
