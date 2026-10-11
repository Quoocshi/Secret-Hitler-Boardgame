package com.example.backend.support;
import com.example.backend.SecretHitlerApplication;
import com.example.backend.service.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.*;
/** Test-classpath launcher. None of these endpoints are in the production artifact. */
public class FixtureServerApplication {
 public static void main(String[] args){new SpringApplicationBuilder(SecretHitlerApplication.class,Fixtures.class).properties("server.address=127.0.0.1","server.port=8081","app.test-fixtures.enabled=true","debug=false","logging.level.root=WARN").run(args);}
 @TestConfiguration(proxyBeanMethods=false)
 public static class Fixtures {
  @Bean GameFixtureFactory factory(RoomService rooms,RoomStatePublisher publisher){return new GameFixtureFactory(rooms,publisher);}
  @Bean @org.springframework.context.annotation.Primary TimingProbe timing(GameStateMaskerService masker,org.springframework.messaging.simp.SimpMessagingTemplate messaging){return new TimingProbe(masker,messaging);}
  @RestController
  @org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="app.test-fixtures.enabled",havingValue="true")
  @RequestMapping("/__test")
  @CrossOrigin(origins="http://localhost:3000")
  public static class Endpoints {
   private final GameFixtureFactory factory;private final TimingProbe timing;private final RoomService rooms;
   public Endpoints(GameFixtureFactory factory,TimingProbe timing,RoomService rooms){this.factory=factory;this.timing=timing;this.rooms=rooms;}
   public record Create(String scenario,int playerCount) {}
   public record Seed(String scenario) {}
   @GetMapping("/health") public String health(){return "ready";}
   @PostMapping("/fixtures") public GameFixtureFactory.Fixture create(@RequestBody Create input){return factory.create(input.scenario(),input.playerCount());}
   @PostMapping("/fixtures/{code}") public void seed(@PathVariable String code,@RequestBody Seed input){factory.seed(code,input.scenario());}
   @PostMapping("/expire/{code}") public void expire(@PathVariable String code){factory.expire(code);}
   @GetMapping("/timing/time") public long time(){return System.currentTimeMillis();}
   public record Ready(long version) {}
   @PostMapping("/timing/{code}/ready") public void ready(@PathVariable String code,@RequestHeader("X-Session-Token") String token,@RequestBody Ready input){timing.ready(rooms.getRoomOrThrow(code),token,input.version());}
   @GetMapping("/timing/{code}") public java.util.List<TimingProbe.Sample> samples(@PathVariable String code){return timing.samples(rooms.getRoomOrThrow(code));}
  }
 }
}
