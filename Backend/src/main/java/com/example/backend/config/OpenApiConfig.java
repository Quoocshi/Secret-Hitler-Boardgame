package com.example.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String WEBSOCKET_DOCS = """
            ### WebSocket / STOMP Connection Guide for Frontend
            
            * **SockJS / WebSocket Endpoint:** `ws://localhost:8080/ws`
            * **Headers required on CONNECT:**
              * `X-Session-Token`: `<user_session_token>`
              * `Room-Code`: `<room_code>`
            
            #### 1. SUBSCRIBE Channels (Receiving data from Server)
            * **Personal Game State (Masked/Zero-Trust):** `/queue/room/{roomCode}/state/{sessionToken}`
            * **WebRTC Voice Chat Signaling:** `/queue/room/{roomCode}/signal/{myPlayerId}`
            
            #### 2. SEND Channels (Sending actions to Server - Prefix `/app`)
            * **Mandatory Header for every SEND frame:** `X-Session-Token: <token>`
            * **Start game:** `/app/room/{roomCode}/start`
            * **Nominate Chancellor:** `/app/room/{roomCode}/nominate` (Body: `{"targetPlayerId": "..."}`)
            * **Cast Vote:** `/app/room/{roomCode}/vote` (Body: `{"vote": "JA" | "NEIN"}`)
            * **President discard policy:** `/app/room/{roomCode}/discard` (Body: `{"policyIndex": 0..2}`)
            * **Chancellor enact policy:** `/app/room/{roomCode}/enact` (Body: `{"policyIndex": 0..1}`)
            * **Chancellor request Veto:** `/app/room/{roomCode}/veto/request`
            * **President respond to Veto:** `/app/room/{roomCode}/veto/response` (Body: `{"approve": true | false}`)
            * **Executive Action - Execute:** `/app/room/{roomCode}/execute` (Body: `{"targetPlayerId": "..."}`)
            * **Executive Action - Investigate Loyalty:** `/app/room/{roomCode}/investigate` (Body: `{"targetPlayerId": "..."}`)
            * **Executive Action - Special Election:** `/app/room/{roomCode}/special-election` (Body: `{"targetPlayerId": "..."}`)
            * **Executive Action - End Policy Peek:** `/app/room/{roomCode}/end-action`
            * **WebRTC Voice Signaling:** `/app/room/{roomCode}/signal` (Body: `{"type": "OFFER"|"ANSWER"|"ICE_CANDIDATE", "senderId": "...", "targetId": "...", "data": {...}}`)
            """;

    @Bean
    public OpenAPI secretHitlerOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Secret Hitler Online API & WebSocket Docs")
                        .description(WEBSOCKET_DOCS)
                        .version("1.0.0")
                        .contact(new Contact().name("Backend Team")));
    }
}