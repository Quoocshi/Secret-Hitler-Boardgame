package com.example.backend.service.impl;

import com.example.backend.constants.GameConstants;
import com.example.backend.domain.enums.ExecutiveAction;
import com.example.backend.domain.enums.Phase;
import com.example.backend.domain.enums.PolicyType;
import com.example.backend.domain.enums.Role;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.domain.model.Player;
import com.example.backend.dto.PlayerViewDTO;
import com.example.backend.dto.PublicPlayerDTO;
import com.example.backend.service.GameStateMaskerService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GameStateMaskerServiceImpl implements GameStateMaskerService {

    @Override
    public PlayerViewDTO maskStateForPlayer(GameRoom room, Player targetPlayer) {

        boolean isGameOver = room.getCurrentPhase() == Phase.GAME_OVER;

        // Map public player information; reveal roles only when game is over
        List<PublicPlayerDTO> publicPlayers = room.getPlayers().stream()
                .map(p -> {
                    boolean hasVoted = room.getCurrentVotes().containsKey(p.getId());
                    var vote = room.getLastRevealedVotes().get(p.getId());
                    Role revealedRole = isGameOver ? p.getRole() : null;
                    return PublicPlayerDTO.from(p, hasVoted, vote, revealedRole);
                })
                .collect(Collectors.toList());

        // Determine private cards in hand
        List<PolicyType> handCards = Collections.emptyList();
        if (room.getCurrentPhase() == Phase.LEGISLATIVE_PRESIDENT && targetPlayer.getId().equals(room.getCurrentPresidentId())) {
            handCards = new ArrayList<>(room.getHandPolicies());
        } else if (room.getCurrentPhase() == Phase.LEGISLATIVE_CHANCELLOR && targetPlayer.getId().equals(room.getCurrentChancellorId())) {
            handCards = new ArrayList<>(room.getHandPolicies());
        } else if (room.getCurrentPhase() == Phase.EXECUTIVE_ACTION
                && room.getPendingExecutiveAction() == ExecutiveAction.POLICY_PEEK
                && targetPlayer.getId().equals(room.getCurrentPresidentId())) {
            handCards = new ArrayList<>(room.getHandPolicies());
        }

        // Compute eligible chancellor IDs during NOMINATION phase
        List<String> eligibleChancellorIds = getEligibleChancellorIds(room);

        // Populate loyalty investigation result exclusively for the current President
        String investigatedPlayerId = null;
        PolicyType investigatedParty = null;
        if (room.getCurrentPhase() == Phase.EXECUTIVE_ACTION
                && room.getPendingExecutiveAction() == ExecutiveAction.INVESTIGATE_LOYALTY
                && targetPlayer.getId().equals(room.getCurrentPresidentId())) {
            investigatedPlayerId = room.getLastInvestigatedPlayerId();
            investigatedParty = room.getLastInvestigatedPartyResult();
        }

        return new PlayerViewDTO(
                room.getRoomCode(),
                room.getCurrentPhase(),

                room.getEnactedLiberalPolicies(),
                room.getEnactedFascistPolicies(),
                room.getElectionTracker(),
                room.getDrawDeck().size(),
                room.getDiscardDeck().size(),

                room.getCurrentPresidentId(),
                room.getCurrentChancellorId(),
                room.getNominatedChancellorId(),
                room.getLastElectedPresidentId(),
                room.getLastElectedChancellorId(),
                eligibleChancellorIds,

                room.getPendingExecutiveAction(),
                room.getWinner(),
                room.getWinReason(),

                publicPlayers,
                new ArrayList<>(room.getGameLogs()),

                targetPlayer.getId(),
                targetPlayer.getRole(),
                getKnownAllies(room, targetPlayer),
                handCards,
                investigatedPlayerId,
                investigatedParty
        );
    }

    private List<String> getEligibleChancellorIds(GameRoom room) {
        if (room.getCurrentPhase() != Phase.NOMINATION) {
            return Collections.emptyList();
        }
        int aliveCount = room.getAlivePlayerCount();
        String currentPresId = room.getCurrentPresidentId();
        String lastPresId = room.getLastElectedPresidentId();
        String lastChancId = room.getLastElectedChancellorId();

        return room.getAlivePlayers().stream()
                .filter(p -> !p.getId().equals(currentPresId))
                .filter(p -> !p.getId().equals(lastChancId))
                .filter(p -> aliveCount <= GameConstants.Room.MIN_PLAYERS || !p.getId().equals(lastPresId))
                .map(Player::getId)
                .toList();
    }

    private List<String> getKnownAllies(GameRoom room, Player targetPlayer) {
        if (targetPlayer.getRole() == null || targetPlayer.getRole() == Role.LIBERAL) {
            return Collections.emptyList();
        }

        int playerCount = room.getPlayers().size();

        if (playerCount <= 6) {
            return room.getPlayers().stream()
                    .filter(p -> p.getRole() == Role.FASCIST || p.getRole() == Role.HITLER)
                    .map(Player::getId)
                    .collect(Collectors.toList());
        }

        if (targetPlayer.getRole() == Role.HITLER) {
            return Collections.emptyList();
        } else {
            return room.getPlayers().stream()
                    .filter(p -> p.getRole() == Role.FASCIST || p.getRole() == Role.HITLER)
                    .map(Player::getId)
                    .collect(Collectors.toList());
        }
    }
}