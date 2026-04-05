# Обязательная подготовка агентной сессии (любой провайдер)

Документ — **канон** для шага «сначала подготовь среду», на который ссылается корневой `AGENTS.md`. Провайдер (Cursor, Claude Code, Codex, и т.д.) не отменяет эти шаги: сначала читается `AGENTS.md`, затем выполняется bootstrap.

## Зачем

- **MCP:** глобальный merge через установщик. По умолчанию профиль **пустой**, чтобы не дублировать Built-in серверы плагина ECC; см. **`docs/dev/mcp-deduplication.md`**.

**Зависимости на хосте (npm, pip, Playwright)** не входят в обязательный bootstrap: основной контур — **Docker** с горячей перегрузкой (`docker-compose.dev.yml`, `scripts/start.sh`); библиотеки ставятся в образах. Хостовую установку запускайте только если нужно гонять `npm`/`pytest`/`playwright` **на машине вне контейнеров** (например локальный отладочный запуск без Docker).

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
# по умолчанию — Codex (~/.codex/config.toml, секция mcp_servers)
node scripts/agents/verify-agent-environment.mjs

# Cursor / Claude Code (после install-user / bootstrap)
node scripts/agents/verify-agent-environment.mjs --mcp-target cursor
node scripts/agents/verify-agent-environment.mjs --mcp-target claude
```

Только файлы репозитория (без `~/.cursor/mcp.json` / `~/.claude/settings.json`), например в CI:

```bash
node scripts/agents/verify-agent-environment.mjs --skip-user-mcp-file
```

Политика и обязанность агента: корневой **`AGENTS.md`** → раздел «Политика проверки».

## Пошагово (если агент делает вручную)

### 1) MCP профиль в user-level конфиг

```bash
node scripts/mcp/install-user.mjs
# или
node scripts/mcp/install-user.mjs --target claude
# без ECC — полный stdio-набор:
node scripts/mcp/install-user.mjs --profile standalone
```

См. `mcp/README.md`, `mcp/car-service-platform.default.json` (пустой), `mcp/car-service-platform.standalone.json`.

### 2) Опционально — пакеты на хосте (вне Docker)

```bash
bash scripts/agents/bootstrap-environment.sh
```

Или вместе с MCP: `bash scripts/agents/bootstrap-agent-session.sh --with-host-deps`.

### 3) Прочие провайдеры (Codex и др.)

Формат **Codex** (`~/.codex/config.toml`) отличается от JSON — перенос серверов из `mcp/car-service-platform.standalone.json` вручную или отдельным процессом. См. `mcp/README.md`.

## Чеклист для агента (копируемый)

1. Прочитан `AGENTS.md`.
2. Выполнен `node scripts/agents/verify-agent-environment.mjs` (по умолчанию **Codex**; для Cursor/Claude — `--mcp-target cursor|claude`). При ошибке для Cursor/Claude — `bootstrap-agent-session.sh`, затем verify снова; для Codex — правка `~/.codex/config.toml` по `mcp/README.md`.
3. **Не** требовать `npm ci` / `pip install` на хосте, если задача выполняется в Docker; при сомнении — подтвердить у пользователя или использовать `--with-host-deps` только при явной необходимости запуска тулов на хосте.
4. Пользователь уведомлён о **перезапуске** клиента для подхвата MCP.
5. **MCP hygiene:** напоминание отключить нерелевантные глобальные MCP (см. `docs/dev/mcp-deduplication.md`); в ответе — поле **`MCP hygiene`** по шаблону `AGENTS.md`.
