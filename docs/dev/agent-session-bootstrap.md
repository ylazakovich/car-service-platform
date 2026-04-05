# Обязательная подготовка агентной сессии (любой провайдер)

Документ — **канон** для шага «сначала подготовь среду», на который ссылается корневой `AGENTS.md`. Провайдер (Cursor, Claude Code, Codex, и т.д.) не отменяет эти шаги: сначала читается `AGENTS.md`, затем выполняется bootstrap.

## Зачем

- **MCP** из профиля проекта должны быть доступны агенту (глобальный merge через установщик).
- **GitHub MCP** требует токен. В этом репозитории принято брать **текущий токен сессии GitHub CLI** (`gh auth token`) и подставлять его в gitignored `mcp/local.overrides.json`, затем пересобрать user-level MCP — без хранения долгоживущего PAT в репозитории.

**Зависимости на хосте (npm, pip, Playwright)** не входят в обязательный bootstrap: основной контур — **Docker** с горячей перегрузкой (`docker-compose.dev.yml`, `scripts/start.sh`); библиотеки ставятся в образах. Хостовую установку запускайте только если нужно гонять `npm`/`pytest`/`playwright` **на машине вне контейнеров** (например локальный отладочный запуск без Docker).

## Быстрый путь (одна команда)

Из **корня репозитория** — **только MCP + gh** (типичный случай):

```bash
bash scripts/agents/bootstrap-agent-session.sh
```

Опции:

```bash
# не вызывать gh (если GitHub MCP не нужен в этой сессии)
bash scripts/agents/bootstrap-agent-session.sh --skip-github-token

# записать MCP в Claude Code вместо Cursor
bash scripts/agents/bootstrap-agent-session.sh --mcp-target claude

# опционально: поставить npm/pip/playwright на хост (вне Docker)
bash scripts/agents/bootstrap-agent-session.sh --with-host-deps

# только хостовые пакеты, без MCP (редко)
bash scripts/agents/bootstrap-agent-session.sh --deps-only
```

После скрипта **перезапустите IDE / Claude Code**, чтобы MCP перечитал конфиг.

## Пошагово (если агент делает вручную)

### 1) MCP профиль в user-level конфиг

```bash
node scripts/mcp/install-user.mjs
# или
node scripts/mcp/install-user.mjs --target claude
```

См. `mcp/README.md` и `mcp/car-service-platform.default.json`.

### 2) GitHub MCP — токен из `gh` на эту сессию

**Требование:** установлен и залогинен [GitHub CLI](https://cli.github.com/) (`gh auth login`).

Агент **обязан** перед работой с GitHub MCP убедиться, что токен актуален для **текущей** сессии:

```bash
node scripts/mcp/sync-github-token-from-gh.mjs
node scripts/mcp/install-user.mjs
```

Скрипт `sync-github-token-from-gh.mjs`:

- выполняет `gh auth token`;
- записывает результат в **`mcp/local.overrides.json`** (файл в `.gitignore`, в коммит не попадает);
- не печатает токен в stdout.

Затем `install-user.mjs` мержит overrides в `~/.cursor/mcp.json` или `~/.claude/settings.json`.

**Важно:** это токен, выданный `gh` для вашей CLI-сессии (OAuth/host token), а не отдельный класс «одноразовых» PAT из веб-UI. Он привязан к сроку жизни сессии `gh` и правам вашего аккаунта. Для агента семантика та же: **на сессию работы** подставить актуальное значение из `gh`, не коммитить и не шарить файл.

Альтернатива без записи в файл: запустить IDE из shell, где задано окружение:

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="$(gh auth token)"
```

(имя переменной должно совпадать с тем, что ожидает `@modelcontextprotocol/server-github` в вашем `mcp.json`.)

### 3) Опционально — пакеты на хосте (вне Docker)

```bash
bash scripts/agents/bootstrap-environment.sh
```

Или вместе с MCP: `bash scripts/agents/bootstrap-agent-session.sh --with-host-deps`.

### 4) Прочие провайдеры (Codex и др.)

Формат **Codex** (`~/.codex/config.toml`) отличается от JSON — перенос серверов из `mcp/car-service-platform.default.json` вручную или отдельным процессом. См. `mcp/README.md`.

## Чеклист для агента (копируемый)

1. Прочитан `AGENTS.md`.
2. Выполнен `node scripts/mcp/install-user.mjs` (нужный `--target`).
3. Если нужен GitHub MCP: выполнен `node scripts/mcp/sync-github-token-from-gh.mjs` и снова `install-user.mjs`, либо экспорт `GITHUB_PERSONAL_ACCESS_TOKEN` из `gh auth token`.
4. **Не** требовать `npm ci` / `pip install` на хосте, если задача выполняется в Docker; при сомнении — подтвердить у пользователя или использовать `--with-host-deps` только при явной необходимости запуска тулов на хосте.
5. Пользователь уведомлён о **перезапуске** клиента для подхвата MCP.
