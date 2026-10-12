FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /build

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
# Git on Windows may check out the wrapper with CRLF line endings.
RUN sed -i 's/\r$//' mvnw
COPY src/ src/
RUN sh ./mvnw -B -ntp verify

FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app
COPY --from=build /build/target/Backend-0.0.1-SNAPSHOT.jar app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-Dfile.encoding=UTF-8", "-jar", "/app/app.jar"]
