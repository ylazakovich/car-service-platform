# CSP Datafaker demo generator

Small Java CLI for generating connected demo/dev seed data for `car-service-platform`.

It intentionally stays outside the Django runtime:

```text
Datafaker CLI -> JSON scenario -> Django import_datafaker_demo command
```

## Requirements

Default local workflow uses Docker Compose and does not require Java or Gradle on the host.

For direct host execution instead, install JDK 17+. Gradle is bootstrapped through the committed Gradle Wrapper (`./gradlew`).

A generated Java CLI cannot run on a host without either Java or Docker. Use Docker mode for hosts that do not have Java installed.

## CLI

```bash
csp-demo-data generate datafaker-demo \
  --seed 123 \
  --locale en-US \
  --count 10 \
  --profile demo \
  --output tmp/datafaker-demo.json
```

Options:

- `--seed <long>`: deterministic seed. The same seed/count/profile emits the same business dataset.
- `--locale <tag>`: Datafaker locale, e.g. `en-US`, `pl-PL`.
- `--count <n>`: number of customers to generate. Omit it to use the selected profile default.
- `--profile small|e2e|demo|showcase|stress`: controls default size and relationship richness.
- `--output <path>`: output JSON path. Use `-` for stdout.

Profile defaults:

- `small`: 5 customers, simple one-car/one-repair rows.
- `e2e`: 10 customers with modest history for deterministic smoke fixtures.
- `demo`: 20 customers by default; local script currently overrides to 10 for faster loads.
- `showcase`: 40 customers and deeper repair history.
- `stress`: 200 customers for heavier local/performance checks.

Generated entities include admin/staff users, customers, vehicles, stable license plates, repairs across `new`, `in_progress`, `waiting_parts`, `completed`, and `picked_up`, suppliers, services, repair service lines, and linked purchases.

## Generate JSON with Docker

From the repository root:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml build datafaker-generator
HOST_UID=$(id -u) HOST_GID=$(id -g) \
  docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm --no-deps \
  datafaker-generator generate datafaker-demo \
  --seed 123 \
  --locale en-US \
  --count 10 \
  --profile demo \
  --output /workspace/tmp/datafaker-demo.json
```

The Docker image is multi-stage:

- build stage: JDK 17 + Gradle Wrapper builds `installDist`;
- runtime stage: JRE 17 only, running the installed `csp-demo-data` CLI.

## Generate JSON with host Java

```bash
cd tools/datafaker-generator
./gradlew --no-daemon installDist
build/install/csp-demo-data/bin/csp-demo-data generate datafaker-demo \
  --seed 123 \
  --locale en-US \
  --count 10 \
  --profile demo \
  --output ../../tmp/datafaker-demo.json
```

## Import into Django

From a running backend/container or local backend environment:

```bash
python manage.py import_datafaker_demo ../tmp/datafaker-demo.json --replace --replace-legacy-sql-demo
```

`--replace` removes rows tagged with the same Datafaker marker before importing, so the generated demo dataset can be recreated safely.
`--replace-legacy-sql-demo` also prunes rows from the former `scripts/demo/demo_data.sql` fixture before importing generated rows.
