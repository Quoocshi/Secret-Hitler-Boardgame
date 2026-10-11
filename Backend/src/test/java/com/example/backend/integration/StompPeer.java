package com.example.backend.integration;
import java.net.URI;
import java.net.http.*;
import java.util.concurrent.*;
import java.util.function.Predicate;
final class StompPeer implements WebSocket.Listener,AutoCloseable {
 private final BlockingQueue<String> frames=new LinkedBlockingQueue<>();
 private final StringBuilder buffer=new StringBuilder();
 private WebSocket socket;
 StompPeer(int port) {socket=HttpClient.newHttpClient().newWebSocketBuilder().buildAsync(URI.create("ws://localhost:"+port+"/ws/websocket"),this).join();}
 @Override public void onOpen(WebSocket ws){ws.request(1);}
 @Override public CompletionStage<?> onText(WebSocket ws,CharSequence data,boolean last){
  buffer.append(data);int end;while((end=buffer.indexOf("\0"))>=0){var frame=buffer.substring(0,end).stripLeading();buffer.delete(0,end+1);if(!frame.isBlank())frames.add(frame);}
  ws.request(1);return CompletableFuture.completedFuture(null);
 }
 @Override public CompletionStage<?> onClose(WebSocket ws,int status,String reason){frames.add("CLOSED "+status);return CompletableFuture.completedFuture(null);}
 @Override public void onError(WebSocket ws,Throwable error){frames.add("ERROR "+error.getClass().getSimpleName());}
 void send(String frame){socket.sendText(frame+"\0",true).join();}
 String await(Predicate<String> condition) throws Exception {
  long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
  while(System.nanoTime()<deadline){var frame=frames.poll(Math.max(1,deadline-System.nanoTime()),TimeUnit.NANOSECONDS);if(frame!=null && condition.test(frame))return frame;}
  throw new AssertionError("Expected STOMP frame did not arrive");
 }
 String connect(String code,String token) throws Exception {send("CONNECT\naccept-version:1.2\nheart-beat:0,0\nRoom-Code:"+code+"\nX-Session-Token:"+token+"\n\n");return await(f->f.startsWith("CONNECTED")||f.startsWith("ERROR")||f.startsWith("CLOSED"));}
 void subscribe(String destination,String id) {send("SUBSCRIBE\nid:"+id+"\ndestination:"+destination+"\nreceipt:"+id+"\n\n");}
 void command(String destination,String id,long version,String body){send("SEND\ndestination:"+destination+"\ncontent-type:application/json\nX-Action-Id:"+id+"\nX-Expected-Version:"+version+"\n\n"+body);}
 @Override public void close(){socket.abort();}
}
