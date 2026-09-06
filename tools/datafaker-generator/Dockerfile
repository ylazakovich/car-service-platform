FROM eclipse-temurin:25.0.4_7-jdk@sha256:e787e08ef76f4c16866108cd7f9fcd96a68eef3ac6cc76866897d4d02d5a2262 AS builder

WORKDIR /src

COPY gradle gradle
COPY gradlew gradlew.bat settings.gradle.kts build.gradle.kts ./
RUN ./gradlew --no-daemon dependencies >/dev/null

COPY src src
RUN ./gradlew --no-daemon installDist

FROM eclipse-temurin:25.0.4_7-jre@sha256:f9e65324a37f28209ce7dd0e5149a7aa954520ed936fb87813cf6ded2400a112

RUN groupadd --system csp \
    && useradd --system --gid csp --home-dir /workspace --shell /usr/sbin/nologin csp \
    && mkdir -p /workspace \
    && chown csp:csp /workspace
WORKDIR /workspace
COPY --from=builder --chown=csp:csp /src/build/install/csp-demo-data /opt/csp-demo-data
USER csp

ENTRYPOINT ["/opt/csp-demo-data/bin/csp-demo-data"]
