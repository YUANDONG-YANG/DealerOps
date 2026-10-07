FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
# The build context must provide the real ai-manager artifact through the Maven repository.
ARG MAVEN_ARGS="-DskipTests"
RUN mvn -B ${MAVEN_ARGS} package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/target/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
