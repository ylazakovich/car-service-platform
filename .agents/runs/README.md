# Agent Runs (Local)

Эта папка хранит локальные артефакты выполнения агентного workflow.

## Формат

- Один запуск = одна подпапка:
  - `.agents/runs/<YYYYMMDD-HHMMSS>-<task-slug>/`

## Что сохранять в run-папку

- `planner.md`
- `architect.md`
- `backend-developer.md` (если роль участвовала)
- `frontend-developer.md` (если роль участвовала)
- `domain-compliance-report.md` (если применимо)
- `plan-review-report.md`
- `final-summary.md`

## Важно

- Папка предназначена для локальной работы и по умолчанию исключена из git.
- Если нужно поделиться конкретным run, можно временно скопировать файлы в `docs/`.
