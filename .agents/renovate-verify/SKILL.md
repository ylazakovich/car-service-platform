# renovate-verify

## Purpose
Проверить, что `renovate.json` (в т.ч. `customManagers` / regex) реально находит зависимости при прогоне Renovate, **до** того как бот откроет PR на GitHub.

## Когда использовать
- Меняли `renovate.json`, `customManagers`, `managerFilePatterns`, `matchStrings`.
- Добавляли отслеживание версии Node (или других полей) в composite action `.github/actions/setup-node/action.yml`.
- Renovate «молчит» или не предлагает ожидаемые обновления.

## Как прогнать (канонично для этого репозитория)

Из корня `car-service-platform`:

```bash
chmod +x scripts/renovate-local-verify.sh   # один раз, если нужно
./scripts/renovate-local-verify.sh
```

Скрипт:
- монтирует репозиторий в контейнер `renovate/renovate`;
- выполняет `renovate --platform=local` с `RENOVATE_DRY_RUN=lookup` (без записи в Git, без токена);
- пишет полный лог в tempfile (путь в консоли);
- проверяет, что **regex manager** сопоставил файл `.github/actions/setup-node/action.yml`.

Переменные окружения (опционально):
- `RENOVATE_IMAGE` — образ (по умолчанию `renovate/renovate:latest`)
- `RENOVATE_LOG_LEVEL` — по умолчанию `debug`
- `RENOVATE_LOG` — явный путь к логу вместо tempfile

## Как интерпретировать результат

### Успех для composite Node (`customManagers` + `node-version`)
В логе должна быть строка вида:
`Matched N file(s) for manager regex: ...setup-node/action.yml...`

Если её нет, чаще всего ошибка в **`managerFilePatterns`**: в Renovate это **regex в слэшах** (как в доке: `"/^Dockerfile$/"`), а не «сырая» строка без разделителей. Для composite action используйте полный путь от корня репозитория:

`"/^\\.github\\/actions\\/setup-node\\/action\\.ya?ml$/"`

Без внешних `/` Renovate может не сопоставить файл (в логе останутся только совпадения preset’а вроде `tsconfig.json`).

### Ложные срабатывания
Менеджер `github-actions` тоже разбирает `setup-node/action.yml` и может показывать `depName: node` с `currentValue: ${{ inputs.node-version }}` — это **не** подтверждение regex `customManager`; ориентируйтесь на строку **Matched … manager regex** для целевого файла.

### Ручной разбор
```bash
grep -E 'custom regex|manager regex|setup-node/action|node-version|currentValue' "$RENOVATE_LOG"
```

## Output для отчёта агента
- Команда и exit code скрипта.
- Путь к сохранённому логу (или последние релевантные строки grep).
- Если FAIL: предполагаемая причина (паттерн файла, опечатка в regex `matchStrings`, неверный `datasourceTemplate`).

## Risks
- Первая загрузка образа требует сети и времени.
- Версия образа `latest` может отличаться от GitHub App Renovate; при расхождении зафиксируйте digest в документации или передайте `RENOVATE_IMAGE`.
