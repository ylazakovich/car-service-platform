# Обязательная подготовка агентной сессии (любой провайдер)

Документ — **канон** для шага «сначала подготовь среду», на который ссылается корневой `AGENTS.md`. Провайдер (Cursor, Claude Code, Codex, и т.д.) не отменяет эти шаги: сначала читается `AGENTS.md`, затем выполняется bootstrap.

## Зачем

- **MCP** из профиля проекта должны быть доступны агенту (глобальный merge через установщик).
- **Зависимости** (Node, Python, браузеры Playwright) должны быть установлены один раз на машине/клон, чтобы команды `npm test`, `playwright`, `pytest` не падали из‑за отсутствия пакетов.
- **GitHub MCP** требует токен. В этом репозитории принято брать **текущий токен сессии GitHub CLI** (`gh auth token`) и подставлять его в gitignored `mcp/local.overrides.json`, затем пересобрать user-level MCP — без хранения долгоживущего PAT в репозитории.

## Быстрый путь (одна команда)

Из **корня репозитория**:

```bash
bash scripts/agents/bootstrap-agent-session.sh
```

Опции:

```bash
# только зависимости, без MCP и без gh
bash scripts/agents/bootstrap-agent-session.sh --deps-only

# не вызывать gh (если GitHub MCP не нужен в этой сессии)
bash scripts/agents/bootstrap-agent-session.sh --skip-github-token

# после записи токена — записать MCP в Claude Code вместо Cursor
bash scripts/agents/bootstrap-agent-session.sh --mcp-target claude
```

После скрипта **перезапустите IDE / Claude Code**, чтобы MCP перечитал конфиг.

## Пошагово (если агент делает вручную)

### 1) Зависимости (идемпотентно)

```bash
bash scripts/agents/bootstrap-environment.sh
```

Делает (если доступны `node` / `npm`, `python3` / `pip`):

- `npm ci` в `frontend/`
- `pip install -r requirements.txt` и `requirements-test.txt` в `backend/` (в текущем интерпретаторе Python — желательно venv)
- `npx playwright install chromium` в `frontend/` (для E2E)

### 2) MCP профиль в user-level конфиг

```bash
node scripts/mcp/install-user.mjs
# или
node scripts/mcp/install-user.mjs --target claude
```

См. `mcp/README.md` и `mcp/car-service-platform.default.json`.

### 3) GitHub MCP — токен из `gh` на эту сессию

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

### 4) Прочие провайдеры (Codex и др.)

Формат **Codex** (`~/.codex/config.toml`) отличается от JSON — перенос серверов из `mcp/car-service-platform.default.json` вручную или отдельным процессом. См. `mcp/README.md`.

## Чеклист для агента (копируемый)

1. Прочитан `AGENTS.md`.
2. Выполнен `bash scripts/agents/bootstrap-environment.sh` (или подтверждено, что зависимости уже стоят).
3. Выполнен `node scripts/mcp/install-user.mjs` (нужный `--target`).
4. Если нужен GitHub MCP: выполнен `node scripts/mcp/sync-github-token-from-gh.mjs` и снова `install-user.mjs`, либо экспорт `GITHUB_PERSONAL_ACCESS_TOKEN` из `gh auth token`.
5. Пользователь уведомлён о **перезапуске** клиента для подхвата MCP.
