package com.example.backend.service;
import com.example.backend.config.BoundRoomPrincipal;
import org.springframework.stereotype.Component;
import java.util.HashMap;
import java.util.Map;
@Component
public class ActiveRoomSessionRegistry {
 private final Map<String,String> active=new HashMap<>();
 private final Map<String,BoundRoomPrincipal> sessions=new HashMap<>();
 private String key(BoundRoomPrincipal p) { return p.roomCode()+"/"+p.playerId(); }
 public synchronized void reserve(String sessionId,BoundRoomPrincipal p) {
  if(sessionId==null || active.containsKey(key(p))) throw new IllegalArgumentException("DUPLICATE_SESSION");
  active.put(key(p),sessionId); sessions.put(sessionId,p);
 }
 public synchronized BoundRoomPrincipal get(String sessionId) { return sessions.get(sessionId); }
 public synchronized boolean isActive(String sessionId,BoundRoomPrincipal p) { return sessionId!=null && sessionId.equals(active.get(key(p))); }
 public synchronized BoundRoomPrincipal release(String sessionId) {
  var p=sessions.remove(sessionId); if(p==null || !active.remove(key(p),sessionId)) return null; return p;
 }
}
