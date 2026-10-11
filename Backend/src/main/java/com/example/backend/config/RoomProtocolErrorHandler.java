package com.example.backend.config;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;
import java.util.Set;
public class RoomProtocolErrorHandler extends StompSubProtocolErrorHandler {
 private static final Set<String> SAFE=Set.of("DUPLICATE_SESSION","INVALID_SESSION","FORBIDDEN_DESTINATION","INVALID_ACTION","INVALID_SIGNAL");
 @Override public Message<byte[]> handleClientMessageProcessingError(Message<byte[]> message,Throwable error) {
  String code="CONNECTION_REJECTED";
  for(Throwable cause=error;cause!=null;cause=cause.getCause())if(cause.getMessage()!=null && SAFE.contains(cause.getMessage())){code=cause.getMessage();break;}
  var headers=StompHeaderAccessor.create(StompCommand.ERROR);headers.setMessage(code);headers.setLeaveMutable(true);
  return MessageBuilder.createMessage(new byte[0],headers.getMessageHeaders());
 }
}
