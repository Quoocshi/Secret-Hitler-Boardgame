package com.example.backend.dto;

import com.example.backend.domain.enums.Role;
import com.example.backend.domain.enums.Vote;
import com.example.backend.domain.model.Player;

// Represents the public information of a player visible to everyone in the room
public record PublicPlayerDTO(
        String id,
        String nickname,
        boolean isAlive,
        boolean isHost,
        boolean isConnected,
        boolean isInvestigated,
        boolean hasVoted,
        Vote lastRevealedVote, // Only populated after a vote concludes; null otherwise
        Role revealedRole      // Strictly null during active game; populated for everyone only at GAME_OVER
) {
    public static PublicPlayerDTO from(Player player, boolean hasVoted, Vote lastRevealedVote, Role revealedRole) {
        return new PublicPlayerDTO(
                player.getId(),
                player.getNickname(),
                player.isAlive(),
                player.isHost(),
                player.isConnected(),
                player.isInvestigated(),
                hasVoted,
                lastRevealedVote,
                revealedRole
        );
    }
}