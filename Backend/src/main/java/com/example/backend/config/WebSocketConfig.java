package com.example.backend.config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.*;
import org.springframework.web.socket.config.annotation.*;
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
 private final RoomChannelInterceptor auth; private final ApplicationContext context; private final String[] origins;
 public WebSocketConfig(RoomChannelInterceptor auth,ApplicationContext context,@Value("${app.allowed-origins:http://localhost:3000}") String[] origins) {this.auth=auth;this.context=context;this.origins=origins;}
 @Override public void configureMessageBroker(MessageBrokerRegistry config) {
  config.enableSimpleBroker("/queue").setHeartbeatValue(new long[]{5000,5000}).setTaskScheduler(new org.springframework.scheduling.concurrent.ConcurrentTaskScheduler(java.util.concurrent.Executors.newSingleThreadScheduledExecutor(r->{Thread t=new Thread(r,"broker-heartbeat");t.setDaemon(true);return t;})));
  config.setApplicationDestinationPrefixes("/app"); config.setUserDestinationPrefix("/user");
  config.configureBrokerChannel().interceptors(new SubscriptionReceiptInterceptor(()->context.getBean("clientOutboundChannel",MessageChannel.class)));
 }
 @Override public void configureClientInboundChannel(ChannelRegistration registration) {registration.interceptors(auth);}
 @Override public void registerStompEndpoints(StompEndpointRegistry registry) { registry.setErrorHandler(new RoomProtocolErrorHandler()); registry.addEndpoint("/ws").setAllowedOrigins(origins).withSockJS(); }
}
