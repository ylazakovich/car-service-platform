# Агентский pipeline и MCP (car-service-platform)

- Last updated: 2026-04-05
- Bootstrap сессии (обязательно для агентов): `docs/dev/agent-session-bootstrap.md`, `bash scripts/agents/bootstrap-agent-session.sh` (по умолчанию без установки пакетов на хост — Docker + hot reload)
- Цель: единая «базовая точка» для Codex / Claude / Cursor без угадывания ролей; согласование с [Everything Claude Code (ECC)](https://github.com/affaan-m/everything-claude-code).

## 1) Локальные роли проекта (source of truth)

Канон для этого репозитория — корневой `AGENTS.md` и `.agents/*/SKILL.md`.

| Роль | Когда обязательна |
|------|-------------------|
| `planner` | нет готового плана, крупная задача |
| `architect` | контракты, границы модулей, риски |
| `domain-reviewer` | статусы, расчёты, PDF/snapshot, dashboard — всё из `DOMAIN_RULES.md` |
| `backend-developer` | API, модели, миграции, Django |
| `frontend-developer` | UI, роутинг, клиент API |
| `e2e-validator` | изменения UI / критичных потоков; поддержка Playwright в актуальном состоянии |
| `e2e-testing` | паттерны Playwright (POM, CI, артефакты); локальная копия [ECC e2e-testing](https://github.com/affaan-m/everything-claude-code/blob/main/.agents/skills/e2e-testing/SKILL.md) с overrides в `.agents/e2e-testing/SKILL.md` |
| `plan-reviewer` | полный scope, закрытие milestone |
| `renovate-verify` | только изменения `renovate.json` / deps policy |

**Не раздувать список кастомных агентов:** для узких задач (TypeScript-only review, починка билда) достаточно инструкции в чате + skill из ECC на стороне пользователя (`typescript-reviewer`, `build-error-resolver`), либо вызов универсального `code-reviewer` из ECC без дублирования файлов в репозитории.

## 2) Что убрать / не дублировать

- Не добавлять 10+ `.md` агентов в `.agents/`, если они полностью совпадают с ECC — это устаревает отдельно от продуктового кода.
- Держать в репозитории **доменно-специфичные** роли: `domain-reviewer`, при необходимости расширения `e2e-validator` под сиды/PDF.
- Исключение: `e2e-testing` — переносимый skill из ECC с явной секцией overrides под этот репозиторий (не дублировать другие ECC skills без той же дисциплины).

## 3) Рекомендуемый MCP набор (из ECC `mcp-configs`)

Подключать точечно (каждый сервер — заметный расход контекста). Для **этого** стека разумный минимум:

| MCP | Зачем в car-service-platform |
|-----|------------------------------|
| **Context7** (документация библиотек) | Django REST, React Router, Playwright API — актуальные сигнатуры |
| **Playwright** (если доступен в вашей установке ECC) | отладка селекторов, скриншоты в CI-артефактах |
| **GitHub** | PR, диффы, статус checks без переключения контекста |
| **Sequential thinking** | сложная декомпозиция задач (опционально) |

Опционально позже: **Memory** — только если команда реально ведёт долгие многосессионные задачи с одними и теми же решениями.

**Не включать по умолчанию:** тяжёлые или редкие серверы (лишние SaaS), если нет ежедневного use case.

**Этот репозиторий:** готовый профиль и установщик — `mcp/car-service-platform.default.json` + `node scripts/mcp/install-user.mjs` (глобально в `~/.cursor/mcp.json` или `~/.claude/settings.json`). Подробности: `mcp/README.md`.

Дополнительно можно копировать блоки из [`mcp-configs/mcp-servers.json`](https://github.com/affaan-m/everything-claude-code/blob/main/mcp-configs/mcp-servers.json) репозитория ECC и вручную вставлять в настройки провайдера.

## 4) Оптимизация pipeline для «сокомандников»

1. В начале задачи указывать **`scope: full` | `scope: iteration`** и ссылку на `NEXT_STEPS.md` пункт.
2. Для UI-задач сразу прикладывать **критерий готовности** в терминах E2E story (из `docs/testing/playwright-e2e-framework.md`).
3. После изменений API — **сначала** `domain-reviewer`, затем контракт тестов (pytest), затем frontend.

## 5) Исправленный дрифт документации

Ранее в `AGENTS.md` была ссылка на отсутствующий `.agents/e2e-validator/SKILL.md`. Файл добавлен; при переименовании ролей обновлять и `AGENTS.md`, и `.agents/README.md` синхронно.
