FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/target/*.jar app.jar
# Same value the publish workflow bakes into the web image. Startup reads PUBLISHED_AT.
ARG PUBLISHED_AT=local
ENV PUBLISHED_AT=${PUBLISHED_AT}
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
