FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
COPY src ./src
# Default: CI stub. Do not copy ai-manager source into this tree.
# Override MAVEN_ARGS="-DskipTests" after `mvn -DskipTests install` in sibling checkout ai-manager.
ARG MAVEN_ARGS="-Pstub,!aimanager -Daimanager.stub=true -DskipTests"
RUN mvn -B ${MAVEN_ARGS} package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/target/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
