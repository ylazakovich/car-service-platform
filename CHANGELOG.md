# Changelog

## [1.4.2](https://github.com/ylazakovich/car-service-platform/compare/v1.4.1...v1.4.2) (2026-07-11)


### Documentation

* **architecture:** document tech quality roadmap ([#219](https://github.com/ylazakovich/car-service-platform/issues/219)) ([9e6ae27](https://github.com/ylazakovich/car-service-platform/commit/9e6ae2741a418845eb4d1cb5dba804811b869ada))
* **release:** polish changelog notes ([#221](https://github.com/ylazakovich/car-service-platform/issues/221)) ([ed77199](https://github.com/ylazakovich/car-service-platform/commit/ed77199da3421ec3dbcb94ce048bcb9730a158cd))


### Chores

* **deps:** lock file maintenance ([#215](https://github.com/ylazakovich/car-service-platform/issues/215)) ([03898d2](https://github.com/ylazakovich/car-service-platform/commit/03898d2129c83918015481028f500852a67befc1))
* **deps:** update allure-cli to v3.14.2 ([#220](https://github.com/ylazakovich/car-service-platform/issues/220)) ([3ba6270](https://github.com/ylazakovich/car-service-platform/commit/3ba62705f95a6c2e193b00288c522919e745d1d4))
* **deps:** update typescript to v7 ([#214](https://github.com/ylazakovich/car-service-platform/issues/214)) ([7feeb77](https://github.com/ylazakovich/car-service-platform/commit/7feeb7768f0cb6eebc08351375b7050f66ff8350))
* **deps:** update vite to v8.0.16 [security] ([#217](https://github.com/ylazakovich/car-service-platform/issues/217)) ([94efb04](https://github.com/ylazakovich/car-service-platform/commit/94efb0487669c4d6380f27ee1620be506b0f1e78))
* **deps:** update vite to v8.1.3 ([#218](https://github.com/ylazakovich/car-service-platform/issues/218)) ([ceb77f7](https://github.com/ylazakovich/car-service-platform/commit/ceb77f70e533702d80f28cbd7cbf28edccec60e9))

## [1.4.1](https://github.com/ylazakovich/car-service-platform/compare/v1.4.0...v1.4.1) (2026-07-11)

### Bug Fixes

- Fixed Renovate package-rule matching so grouped dependency updates are detected correctly.
- Updated the dependency baseline through the current minor and patch set.

## [1.4.0](https://github.com/ylazakovich/car-service-platform/compare/v1.3.0...v1.4.0) (2026-06-01)

### Features

- Shipped the redesigned client portal with the new visual shell, status stepper, and responsive polish.

### Bug Fixes

- Registered repairs models and invite tokens in Django admin.
- Stabilized Django admin coverage and portal display behavior around picked-up repairs.
- Updated Checkstyle and dependency baselines used by the quality toolchain.

## [1.3.0](https://github.com/ylazakovich/car-service-platform/compare/v1.2.0...v1.3.0) (2026-05-31)

### Features

- Added the Datafaker demo-data generator with Docker support and richer demo repair scenarios.
- Added prebuilt repair acts and a packaged Datafaker CLI image for repeatable demo workflows.

### Bug Fixes

- Addressed demo-data review feedback and arm64 Docker build compatibility.
- Enabled Gradle wrapper updates and refreshed dependency baselines.

## [1.2.0](https://github.com/ylazakovich/car-service-platform/compare/v1.1.0...v1.2.0) (2026-05-29)

### Features

- Added required-field gating for repair, purchase, and vehicle create/update flows.
- Replaced footer helper text with compact required-field chips and disabled-button affordances.

### Bug Fixes

- Aligned mobile modal/footer layouts across Vehicles, Purchases, and Repairs.
- Stabilized disabled-state E2E coverage and mobile interaction handling.
- Polished completed-repair card visibility and Today Summary density on smaller laptops.

## [1.1.0](https://github.com/ylazakovich/car-service-platform/compare/v1.0.2...v1.1.0) (2026-05-29)

### Features

- Integrated Sentry error monitoring across frontend and backend deployments.

### Bug Fixes

- Updated the Sentry React dependency and adjusted browser tracing integration.
- Addressed monitoring review feedback before release.

## [1.0.2](https://github.com/ylazakovich/car-service-platform/compare/v1.0.1...v1.0.2) (2026-05-28)

### Bug Fixes

- Improved CI report generation, Allure publishing, and test pyramid rendering.
- Stabilized dashboard, repair, purchase, and vehicle UI behavior across desktop and mobile.
- Hardened Railway deployment settings, Docker compatibility, and frontend nginx configuration.
- Fixed repair PDF buffering, portal status edge cases, invoice parsing error handling, and image URL sanitization.
- Stabilized Playwright smoke/E2E coverage for Registers, Repairs, consumables, mobile navigation, and service-line flows.

## [1.0.1](https://github.com/ylazakovich/car-service-platform/compare/v1.0.0...v1.0.1) (2026-05-28)

### Bug Fixes

- Closed repair modals on Escape.

## 1.0.0 (2026-05-27)

### Features

- Added the initial staff-facing car service workspace: repairs Kanban, vehicles, purchases, users, registers, dashboard analytics, and mobile-first staff shell.
- Added secure client portal flows with tokenized access, 3D login flip, status tracker, portal link management, and copy/regeneration controls.
- Added repair lifecycle support including picked-up completion, assignee filtering, service-line handoff, PDF certificates of completion, and versioned financial snapshots.
- Added purchases and inventory foundations: delivered flags, bulk purchase flows, invoice OCR/templates, supplier previews, units of measure, and service catalog management.
- Added demo and developer foundations including demo staff seed data, Docker dev stack, LAN/phone access helpers, and MCP profiles for agent workflows.
- Added production deployment preparation for Railway and Sentry-ready monitoring hooks.

### Bug Fixes

- Polished repair, purchase, auth, dashboard, and mobile layouts across the first release cycle.
- Hardened CI, Allure reporting, Playwright E2E setup, test-pyramid snapshots, and workflow report publishing.
- Fixed Railway networking/runtime issues, PDF export handling, migration graph stability, and frontend security hardening.
- Stabilized mobile staff modals, kanban scrolling, vehicle repair history, Registers UX, and consumables table layouts.

### CI

- Added desktop and mobile Playwright projects, smoke tests, Allure report merging, GitHub Pages report deployment, and advisory test-pyramid quality gates.
