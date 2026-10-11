package com.example.backend.config;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.*;
import java.util.function.Supplier;
/** Installed on the synchronous broker channel: receipt follows actual broker registration. */
public class SubscriptionReceiptInterceptor implements ChannelInterceptor {
 private final Supplier<MessageChannel> outbound;
 public SubscriptionReceiptInterceptor(Supplier<MessageChannel> outbound) { this.outbound=outbound; }
 @Override public void afterSendCompletion(Message<?> message,MessageChannel channel,boolean sent,Exception error) {
  var h=StompHeaderAccessor.wrap(message);
  if(!sent || error!=null || h.getCommand()!=StompCommand.SUBSCRIBE) return;
  String receipt=h.getReceipt();
  if(receipt==null) return;
  var reply=StompHeaderAccessor.create(StompCommand.RECEIPT);
  reply.setSessionId(h.getSessionId()); reply.setReceiptId(receipt); reply.setLeaveMutable(true);
  outbound.get().send(MessageBuilder.createMessage(new byte[0],reply.getMessageHeaders()));
 }
}
