# CSP Datafaker demo generator

Small Java CLI for generating connected demo/dev seed data for `car-service-platform`.

It intentionally stays outside the Django runtime:

```text
Java Datafaker CLI -> JSON scenario -> Django import_datafaker_demo command
```

## Requirements

- JDK 17+
- Gradle 8+

The repository does not commit a Gradle wrapper yet, so this tool uses a locally installed `gradle`.

## Generate JSON

```bash
cd tools/datafaker-generator
gradle run --args="--seed 123 --locale en-US --count 5 --profile small --output ../../tmp/datafaker-demo.json"
```

Options:

- `--seed <long>`: deterministic seed. The same seed/count/profile emits the same business dataset.
- `--locale <tag>`: Datafaker locale, e.g. `en-US`, `pl-PL`.
- `--count <n>`: number of customer/vehicle/repair scenarios.
- `--profile small|demo|stress`: size hint stored in metadata and used by helper scripts.
- `--output <path>`: output JSON path. Use `-` for stdout.

## Import into Django

From a running backend/container or local backend environment:

```bash
python manage.py import_datafaker_demo ../tmp/datafaker-demo.json --replace
```

`--replace` removes rows tagged with the same Datafaker marker before importing, so the generated demo dataset can be recreated safely.
