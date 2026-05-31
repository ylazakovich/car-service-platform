plugins {
    application
}

group = "local.csp"
version = "0.1.0"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(17))
    }
}

application {
    applicationName = "csp-demo-data"
    mainClass.set("local.csp.demo.DatafakerDemoGenerator")
}

dependencies {
    implementation("net.datafaker:datafaker:2.5.4")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.21.3")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310:2.21.3")

    testImplementation("org.junit.jupiter:junit-jupiter:5.14.4")
}

tasks.test {
    useJUnitPlatform()
}
