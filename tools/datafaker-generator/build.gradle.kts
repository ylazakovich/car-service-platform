plugins {
    application
    checkstyle
    id("com.github.spotbugs") version "6.5.11"
}

group = "local.csp"
version = "0.1.0"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

checkstyle {
    toolVersion = "13.11.0"
    configDirectory.set(layout.projectDirectory.dir("config/checkstyle"))
}

tasks.withType<Checkstyle>().configureEach {
    maxWarnings = 0
    isShowViolations = true
    reports {
        xml.required.set(System.getenv("CI") != null)
        html.required.set(System.getenv("CI") == null)
    }
}

spotbugs {
    effort.set(com.github.spotbugs.snom.Effort.MAX)
    reportLevel.set(com.github.spotbugs.snom.Confidence.DEFAULT)
    excludeFilter.set(layout.projectDirectory.file("config/spotbugs/excludeFilter.xml"))
}

application {
    applicationName = "csp-demo-data"
    mainClass.set("local.csp.demo.DatafakerDemoGenerator")
}

dependencies {
    implementation("net.datafaker:datafaker:2.7.0")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.22.2")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310:2.22.2")

    testImplementation("org.junit.jupiter:junit-jupiter:6.1.3")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}
