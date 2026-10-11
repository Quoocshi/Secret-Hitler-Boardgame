package com.example.backend.service;

import com.example.backend.domain.model.GameRoom;
import com.example.backend.domain.model.Player;
import com.example.backend.dto.PlayerViewDTO;

public interface GameStateMaskerService {

    // Transforms the global game state into a customized, safe view for a specific player
    PlayerViewDTO maskStateForPlayer(GameRoom room, Player targetPlayer);
}