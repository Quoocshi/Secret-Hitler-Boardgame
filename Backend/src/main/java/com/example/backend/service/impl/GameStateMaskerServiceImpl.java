package com.example.backend.service.impl;

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
        synchronized (room) {

        // Map public player information
        List<PublicPlayerDTO> publicPlayers = room.getPlayers().stream()
                .map(p -> {
                    boolean hasVoted = room.getCurrentVotes().containsKey(p.getId());
                    // Only reveal actual votes if they are in the lastRevealedVotes map (after voting phase ends)
                    var vote = room.getLastRevealedVotes().get(p.getId());
                    return PublicPlayerDTO.from(p, hasVoted, vote);
                })
                .collect(Collectors.toList());

        // Determine private cards in hand (Only President/Chancellor see hand cards during their respective phases)
        List<PolicyType> handCards = Collections.emptyList();
        if (room.getCurrentPhase() == Phase.LEGISLATIVE_PRESIDENT && targetPlayer.getId().equals(room.getCurrentPresidentId())) {
            handCards = new ArrayList<>(room.getHandPolicies());
        } else if (room.getCurrentPhase() == Phase.LEGISLATIVE_CHANCELLOR && targetPlayer.getId().equals(room.getCurrentChancellorId())) {
            handCards = new ArrayList<>(room.getHandPolicies());
        } else if (room.getCurrentPhase() == Phase.EXECUTIVE_ACTION && room.getPendingExecutiveAction() == com.example.backend.domain.enums.ExecutiveAction.POLICY_PEEK && targetPlayer.getId().equals(room.getCurrentPresidentId())) {
            // Give president a peek at the cards if POLICY_PEEK is active
            handCards = new ArrayList<>(room.getHandPolicies());
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

                room.getPendingExecutiveAction(),
                room.getWinner(),
                room.getWinReason(),

                publicPlayers,
                new ArrayList<>(room.getGameLogs()),

                targetPlayer.getId(),
                targetPlayer.getRole(),
                getKnownAllies(room, targetPlayer),
                handCards,
                getInvestigatedParty(room, targetPlayer),
                room.getStateVersion(),
                room.isVetoRequestedThisRound(),
                List.copyOf(room.getInvestigationResults().getOrDefault(targetPlayer.getId(), List.of()))
        );
        }
    }

    // Resolves which players the target player is allowed to know the identities of
    private List<String> getKnownAllies(GameRoom room, Player targetPlayer) {
        if (targetPlayer.getRole() == null || targetPlayer.getRole() == Role.LIBERAL) {
            return Collections.emptyList();
        }

        int playerCount = room.getPlayers().size();

        // 5-6 player rules: Fascists AND Hitler know who each other are
        if (playerCount <= 6) {
            return room.getPlayers().stream()
                    .filter(p -> p.getRole() == Role.FASCIST || p.getRole() == Role.HITLER)
                    .map(Player::getId)
                    .collect(Collectors.toList());
        }

        // 7-10 player rules: Fascists know other Fascists and Hitler. Hitler knows NO ONE.
        if (targetPlayer.getRole() == Role.HITLER) {
            return Collections.emptyList();
        } else {
            // Target is a normal Fascist
            return room.getPlayers().stream()
                    .filter(p -> p.getRole() == Role.FASCIST || p.getRole() == Role.HITLER)
                    .map(Player::getId)
                    .collect(Collectors.toList());
        }
    }

    // Checks if this player recently investigated someone and returns the result
    private PolicyType getInvestigatedParty(GameRoom room, Player targetPlayer) {
        var results = room.getInvestigationResults().getOrDefault(targetPlayer.getId(), List.of());
        return results.isEmpty() ? null : results.getLast().partyMembership();
    }
}
