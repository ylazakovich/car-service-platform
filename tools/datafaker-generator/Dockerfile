FROM eclipse-temurin:17-jdk AS builder

WORKDIR /src

COPY gradle gradle
COPY gradlew gradlew.bat settings.gradle.kts build.gradle.kts ./
RUN ./gradlew --no-daemon dependencies >/dev/null

COPY src src
RUN ./gradlew --no-daemon installDist

FROM eclipse-temurin:17-jre

WORKDIR /workspace
COPY --from=builder /src/build/install/csp-demo-data /opt/csp-demo-data

ENTRYPOINT ["/opt/csp-demo-data/bin/csp-demo-data"]
