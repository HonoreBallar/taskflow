# ---- Build ----
FROM maven:3.9-eclipse-temurin-26 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

# ---- Run ----
FROM eclipse-temurin:17-jre
WORKDIR /app
# Correctifs de sécurité des paquets système parus depuis la publication de l'image de base
RUN apt-get update && apt-get upgrade -y --no-install-recommends && rm -rf /var/lib/apt/lists/* \
    && useradd -r -u 1001 taskflow && mkdir -p /app/uploads && chown taskflow /app/uploads
COPY --from=build /app/target/taskflow-backend-*.jar app.jar
# UID numérique (celui de « taskflow ») : vérifiable par un orchestrateur sans lire /etc/passwd
USER 1001
EXPOSE 8080
ENV UPLOAD_DIR=/app/uploads
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
