# Подготовка сессии AI-агента в IDE (опционально)

Документ описывает **MCP, verify и хостовые deps** для работы через Cursor / Claude Code / Codex. Он **не** входит в продуктовую спеку (`docs/spec/`): для сборки и запуска приложения достаточно [`docs/spec/RUNBOOK.md`](../spec/RUNBOOK.md).

Корневой [`AGENTS.md`](../../AGENTS.md) задаёт **роли, scope и маршрутизацию**; технические шаги IDE — **здесь** (и в [`mcp-deduplication.md`](./mcp-deduplication.md), [`agents-and-mcp.md`](./agents-and-mcp.md)).

## Зачем

- **MCP:** глобальный merge через установщик. По умолчанию профиль **пустой**, чтобы не дублировать Built-in серверы плагина ECC; см. **`docs/dev/mcp-deduplication.md`**.

**Зависимости на хосте (npm, pip, Playwright)** не входят в обязательный bootstrap: основной контур — **Docker** с горячей перегрузкой (`docker-compose.dev.yml`, `scripts/compose/start.sh`); библиотеки ставятся в образах. Хостовую установку запускайте только если нужно гонять `npm`/`pytest`/`playwright` **на машине вне контейнеров** (например локальный отладочный запуск без Docker).

## Быстрый путь (одна команда)

Из **корня репозитория** — **только MCP** (типичный случай):

```bash
bash scripts/agents/bootstrap-agent-session.sh
```

Опции:

```bash
# записать MCP в Claude Code вместо Cursor
bash scripts/agents/bootstrap-agent-session.sh --mcp-target claude

# нет плагина everything-claude-code — поставить полный stdio-профиль (см. docs/dev/mcp-deduplication.md)
bash scripts/agents/bootstrap-agent-session.sh --mcp-profile standalone

# опционально: поставить npm/pip/playwright на хост (вне Docker)
bash scripts/agents/bootstrap-agent-session.sh --with-host-deps

# только хостовые пакеты, без MCP (редко)
bash scripts/agents/bootstrap-agent-session.sh --deps-only
```

После скрипта **перезапустите IDE / Claude Code**, чтобы MCP перечитал конфиг.

## Проверка: окружение готово для агентов

Из **корня репозитория** (после bootstrap или перед задачей):

```bash
# по умолчанию — auto: ~/.cursor/mcp.json → cursor, иначе ~/.claude/settings.json → claude, иначе ~/.codex/config.toml → codex
node scripts/agents/verify-agent-environment.mjs

# явный клиент (если на машине несколько конфигов и авто не то)
node scripts/agents/verify-agent-environment.mjs --mcp-target cursor
node scripts/agents/verify-agent-environment.mjs --mcp-target claude
node scripts/agents/verify-agent-environment.mjs --mcp-target codex

# строго: для Cursor/Claude ошибка, если mcpServers пустой
node scripts/agents/verify-agent-environment.mjs --strict
```

Только файлы репозитория (без `~/.cursor/mcp.json` / `~/.claude/settings.json`), например в CI:

```bash
node scripts/agents/verify-agent-environment.mjs --skip-user-mcp-file
```

Политика проверки MCP и ожидания по `verify-agent-environment` — **в этом документе** (разделы «Проверка» и чеклист ниже). В **`AGENTS.md`** остаётся только краткая отсылка сюда.

## Пошагово (если агент делает вручную)

### 1) MCP профиль в user-level конфиг

```bash
node scripts/mcp/install-user.mjs
# или
node scripts/mcp/install-user.mjs --target claude
# без ECC — полный stdio-набор:
node scripts/mcp/install-user.mjs --profile standalone
```

См. `scripts/mcp/README.md`, `scripts/mcp/car-service-platform.default.json` (пустой), `scripts/mcp/car-service-platform.standalone.json`.

### 2) Опционально — пакеты на хосте (вне Docker)

```bash
bash scripts/agents/bootstrap-environment.sh
```

Или вместе с MCP: `bash scripts/agents/bootstrap-agent-session.sh --with-host-deps`.

### 3) Прочие провайдеры (Codex и др.)

Формат **Codex** (`~/.codex/config.toml`) отличается от JSON — перенос серверов из `scripts/mcp/car-service-platform.standalone.json` вручную или отдельным процессом. См. `scripts/mcp/README.md`.

## Чеклист для агента (копируемый)

1. Прочитан `AGENTS.md`.
2. Выполнен `node scripts/agents/verify-agent-environment.mjs` (по умолчанию **auto**: cursor → claude → codex; явный `--mcp-target` при необходимости; `--strict` — не допускать пустой `mcpServers` в JSON). При ошибке для Cursor/Claude — `bootstrap-agent-session.sh`, затем verify снова; для Codex — правка `~/.codex/config.toml` по `scripts/mcp/README.md`.
3. **Не** требовать `npm ci` / `pip install` на хосте, если задача выполняется в Docker; при сомнении — подтвердить у пользователя или использовать `--with-host-deps` только при явной необходимости запуска тулов на хосте.
4. Пользователь уведомлён о **перезапуске** клиента для подхвата MCP.
5. **MCP hygiene:** напоминание отключить нерелевантные глобальные MCP (см. `docs/dev/mcp-deduplication.md`); в ответе агента — поле **`MCP hygiene`** по шаблону в корневом `AGENTS.md`.

## Напоминание пользователю (hygiene)

Подключённые глобальные MCP участвуют в сессии (схемы инструментов → расход контекста), даже если задача их не использует. Имеет смысл **один раз за сессию** напомнить пользователю отключить лишнее в настройках Cursor / Claude Code / Codex. Репозиторий **не может** автоматически отключить чужие MCP; для Codex в проекте см. пример **`.codex/config.toml`**. Полный текст: **`docs/dev/mcp-deduplication.md`** (раздел «Предупреждение пользователю»).
