package com.example.backend.dto;

import com.example.backend.domain.enums.ExecutiveAction;
import com.example.backend.domain.enums.Phase;
import com.example.backend.domain.enums.PolicyType;
import com.example.backend.domain.enums.Role;
import com.example.backend.domain.enums.Winner;

import java.util.List;

// The masked, zero-trust game state uniquely tailored for a specific player's sessionToken
public record PlayerViewDTO(
        String roomCode,
        Phase currentPhase,

        // General Game Status
        int enactedLiberalPolicies,
        int enactedFascistPolicies,
        int electionTracker,
        int drawDeckSize,
        int discardDeckSize,

        // Presidency & Government
        String currentPresidentId,
        String currentChancellorId,
        String nominatedChancellorId,
        String lastElectedPresidentId,
        String lastElectedChancellorId,
        List<String> eligibleChancellorIds, // Valid candidate IDs for Chancellor during NOMINATION phase

        // Executive Actions & End Game
        ExecutiveAction pendingExecutiveAction,
        Winner winner,
        String winReason,

        // Public Players Data (Roles are masked unless currentPhase == GAME_OVER)
        List<PublicPlayerDTO> players,
        List<String> gameLogs,

        // Private Data (Only visible to the receiver)
        String myPlayerId,
        Role myRole,
        List<String> knownAllyIds,
        List<PolicyType> handCards,

        // Investigation result (Only populated for the investigating President during EXECUTIVE_ACTION)
        String investigatedPlayerId,
        PolicyType investigatedPartyMembership
) {}