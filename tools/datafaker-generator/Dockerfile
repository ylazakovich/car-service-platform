FROM eclipse-temurin:21.0.11_10-jdk@sha256:b9142586f9712700c6c9e07adcedfb18608b1a3a056e4001423a3354adfa9d80 AS builder

WORKDIR /src

COPY gradle gradle
COPY gradlew gradlew.bat settings.gradle.kts build.gradle.kts ./
RUN ./gradlew --no-daemon dependencies >/dev/null

COPY src src
RUN ./gradlew --no-daemon installDist

FROM eclipse-temurin:21.0.11_10-jre@sha256:010e0a06bd4e0184dec58626afb3ba727b42c56c91b977e2f0a9e0837e0fa3fb

RUN groupadd --system csp \
    && useradd --system --gid csp --home-dir /workspace --shell /usr/sbin/nologin csp \
    && mkdir -p /workspace \
    && chown csp:csp /workspace
WORKDIR /workspace
COPY --from=builder --chown=csp:csp /src/build/install/csp-demo-data /opt/csp-demo-data
USER csp

ENTRYPOINT ["/opt/csp-demo-data/bin/csp-demo-data"]
