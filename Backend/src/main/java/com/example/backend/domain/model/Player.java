package com.example.backend.domain.model;

import com.example.backend.domain.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Player {
    private String id;
    private String sessionToken;
    private String nickname;
    private Role role;

    @Builder.Default
    private boolean isAlive = true;

    @Builder.Default
    private boolean isHost = false;

    @Builder.Default
    private boolean isConnected = false;

    @Builder.Default
    private boolean isInvestigated = false;
}
