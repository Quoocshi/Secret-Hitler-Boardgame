package com.example.backend.service;
import com.example.backend.config.BoundRoomPrincipal;
import com.example.backend.domain.enums.Vote;
import com.example.backend.domain.model.GameRoom;
import com.example.backend.dto.ActionResultDTO;
import com.example.backend.exception.GameException;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.util.UUID;
@Service
public class GameCommandService {
 private static final org.slf4j.Logger log=org.slf4j.LoggerFactory.getLogger(GameCommandService.class);
 private final RoomService rooms; private final GameEngineService engine; private final RoomStatePublisher publisher; private final JsonMapper json;
 public GameCommandService(RoomService rooms,GameEngineService engine,RoomStatePublisher publisher,JsonMapper json){this.rooms=rooms;this.engine=engine;this.publisher=publisher;this.json=json;}
 private ActionResultDTO rejected(String id,String action,String code,String message,long version){return new ActionResultDTO(id,action,"REJECTED",code,message,version);}
 public ActionResultDTO handle(BoundRoomPrincipal actor,String action,String id,String expectedVersion,String payload) {
  var room=rooms.getRoomOrThrow(actor.roomCode());
  synchronized(room) {
   ActionResultDTO result;
   String key=actor.playerId()+"/"+id;
   String fingerprint=null;
   boolean cacheable=false;
   try {
    if(id==null || !UUID.fromString(id).toString().equalsIgnoreCase(id)) throw new IllegalArgumentException();
    JsonNode body;
    try {body=json.readTree(payload);fingerprint=body==null?action+":raw:"+payload:action+":json:"+canonical(body);}
    catch(tools.jackson.core.JacksonException parseError){body=null;fingerprint=action+":raw:"+payload;}
    cacheable=true;
    var previous=room.getActionResults().get(key);
    if(previous!=null) {
     result=previous.fingerprint().equals(fingerprint)?previous.result():rejected(id,action,"ACTION_ID_REUSED","Mã thao tác đã được dùng cho nội dung khác.",room.getStateVersion());
     deliverResult(room,actor,result); return result;
    }
    if(body==null || !body.isObject()) throw new IllegalArgumentException();
    long expected=Long.parseLong(expectedVersion);
    if(expected!=room.getStateVersion()) throw new GameException("STALE_STATE",400,"Phòng vừa thay đổi. Hãy kiểm tra và xác nhận lại thao tác.");
    var member=room.findBySessionToken(actor.sessionToken()).orElseThrow(()->new GameException("INVALID_SESSION",401,"Phiên chơi không hợp lệ."));
    if(!member.getId().equals(actor.playerId()) || !member.isAlive()) throw new GameException("INVALID_ACTION",400,"Bạn không có quyền thực hiện thao tác này.");
    switch(action) {
     case "start" -> engine.startGame(room,actor.sessionToken());
     case "nominate" -> engine.nominateChancellor(room,actor.sessionToken(),target(body));
     case "vote" -> engine.castVote(room,actor.sessionToken(),Vote.valueOf(string(body,"vote")));
     case "discard" -> engine.presidentDiscardPolicy(room,actor.sessionToken(),index(body));
     case "enact" -> engine.chancellorEnactPolicy(room,actor.sessionToken(),index(body));
     case "veto/request" -> engine.chancellorRequestVeto(room,actor.sessionToken());
     case "veto/response" -> { if(!body.path("approve").isBoolean()) throw new IllegalArgumentException(); engine.presidentRespondToVeto(room,actor.sessionToken(),body.path("approve").asBoolean()); }
     case "execute" -> engine.executePlayer(room,actor.sessionToken(),target(body));
     case "investigate" -> engine.investigatePlayer(room,actor.sessionToken(),target(body));
     case "special-election" -> engine.callSpecialElection(room,actor.sessionToken(),target(body));
     case "end-action" -> engine.endExecutiveAction(room,actor.sessionToken());
     default -> throw new GameException("INVALID_ACTION",400,"Thao tác không hợp lệ.");
    }
    room.commitMutation(); result=new ActionResultDTO(id,action,"ACCEPTED",null,null,room.getStateVersion());
   } catch(GameException e) { result=rejected(id,action,e.getCode(),e.getMessage(),room.getStateVersion()); }
   catch(tools.jackson.core.JacksonException | IllegalArgumentException | NullPointerException e) {result=rejected(id,action,"INVALID_PAYLOAD","Thông tin thao tác không hợp lệ.",room.getStateVersion());}
   catch(Exception e) {result=rejected(id,action,"SERVER_ERROR","Máy chủ chưa thể xử lý thao tác.",room.getStateVersion());}
   if(cacheable && fingerprint!=null) room.getActionResults().put(key,new GameRoom.CachedAction(fingerprint,result));
   if(result.status().equals("ACCEPTED"))try {publisher.publish(room);}catch(RuntimeException deliveryError){log.warn("State delivery failed; clients can recover by synchronizing.");}
   deliverResult(room,actor,result); return result;
  }
 }
 private void deliverResult(GameRoom room,BoundRoomPrincipal actor,ActionResultDTO result){try{publisher.result(room.getRoomCode(),actor.playerId(),result);}catch(RuntimeException deliveryError){log.warn("Command result delivery failed; committed result remains cached.");}}
 private String canonical(JsonNode node) {
  if(node.isObject()) { var keys=new java.util.TreeMap<String,String>(); node.properties().forEach(e->keys.put(e.getKey(),canonical(e.getValue()))); return json.writeValueAsString(keys); }
  if(node.isArray()) {var values=new java.util.ArrayList<String>();node.forEach(n->values.add(canonical(n)));return json.writeValueAsString(values);}
  return node.toString();
 }
 private String string(JsonNode body,String key){var node=body.path(key);if(!node.isString() || node.asString().isBlank())throw new IllegalArgumentException();return node.asString();}
 private String target(JsonNode body){return string(body,"targetPlayerId");}
 private int index(JsonNode body){var node=body.path("policyIndex");if(!node.isIntegralNumber() || !node.canConvertToInt())throw new IllegalArgumentException();return node.asInt();}
}
