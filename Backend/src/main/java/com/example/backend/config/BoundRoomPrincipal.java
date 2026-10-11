package com.example.backend.config;
import java.security.Principal;
public record BoundRoomPrincipal(String roomCode, String playerId, String sessionToken) implements Principal {
 @Override public String getName() { return playerId; }
 @Override public String toString() { return "RoomPrincipal[room="+roomCode+", player="+playerId+"]"; }
}
