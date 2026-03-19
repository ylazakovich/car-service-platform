# Agent Runs (Local)

Эта папка хранит локальные артефакты выполнения агентного workflow.

## Формат

- Один запуск = одна подпапка:
  - `.agents/runs/<YYYYMMDD-HHMMSS>-<task-slug>/`

## Что сохранять в run-папку

- `planner.md`
- `architect.md`
- `domain-review-plan.md` (если был pre-implementation domain review)
- `domain-review-final.md` (если был post-implementation domain review)
- `backend-developer.md` (если роль участвовала)
- `frontend-developer.md` (если роль участвовала)
- `plan-review-report.md`
- `final-summary.md`

## Важно

- Папка предназначена для локальной работы и по умолчанию исключена из git.
- Если нужно поделиться конкретным run, можно временно скопировать файлы в `docs/`.
