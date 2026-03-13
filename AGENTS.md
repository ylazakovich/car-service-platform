# Agent Workflow (Project-Local)

Этот проект использует локальные agent skills из папки `.agents`.

Цель: единый workflow для планирования, реализации и верификации изменений в `car-service-platform` без привязки к одному ассистенту.

## Структура

- `.agents/planner/SKILL.md` — декомпозиция задачи и исполнимый план.
- `.agents/architect/SKILL.md` — проверка архитектурной целостности.
- `.agents/backend-developer/SKILL.md` — реализация серверной части.
- `.agents/frontend-developer/SKILL.md` — реализация клиентской части.
- `.agents/domain-rules-reviewer/SKILL.md` — проверка соответствия `DOMAIN_RULES.md`.
- `.agents/plan-reviewer/SKILL.md` — финальная сверка плана и результата.

## Обязательные Источники Контекста

- `DEVELOPMENT_PLAN.md` — active стратегический план.
- `NEXT_STEPS.md` — active backlog (`NOW/NEXT/LATER`).
- `DOMAIN_RULES.md` — source of truth по доменным правилам, статусам и расчетам.
- `docs/planning/archive/` — архив завершенных этапов и snapshot-планов.

## Обязательный Порядок Работы

1. Создать `RUN_DIR` в `.agents/runs/<YYYYMMDD-HHMMSS>-<task-slug>/`.
2. Прочитать задачу и ограничения.
3. Запустить `planner` для пошагового плана.
4. Прогнать план через `architect`.
5. Реализовать изменения через `backend-developer` и/или `frontend-developer`.
6. Если задача меняет доменные правила, статусы, расчеты или критичные бизнес-потоки, прогнать `domain-rules-reviewer`.
7. Прогнать итог через `plan-reviewer`.
8. Вернуть результат с кратким changelog и остаточными рисками.

Форматы выходных отчетов:
- `domain-rules-reviewer` -> `.agents/templates/domain-compliance-report.md`
- `plan-reviewer` -> `.agents/templates/plan-review-report.md`

## Локальное Хранение Артефактов

- База: `.agents/runs/`
- Один запуск = одна папка `RUN_DIR`
- Рекомендуемый helper:
  - `scripts/agents/new-run.sh "task name"`

Сохранять в `RUN_DIR`:
- `planner.md`
- `architect.md`
- `backend-developer.md` (если роль участвовала)
- `frontend-developer.md` (если роль участвовала)
- `domain-compliance-report.md` (если применимо)
- `plan-review-report.md`
- `final-summary.md`

## Режимы

- `mode: plan` — агент строит или уточняет план, код не меняет.
- `mode: execute` — агент реализует задачу по утвержденному плану.

Если режим не указан явно:
- если нет пошагового плана или задача сформулирована как исследование/дизайн -> `plan`
- если есть утвержденный план и запрос на реализацию -> `execute`

## Auto Routing Rules

В режиме `execute` агент выбирает роль по триггерам:

1. `backend-developer`, если задача затрагивает:
- API, endpoint, controller, service, repository
- DB, schema, migration, query, transaction
- auth, permissions, integrations, бизнес-правила

2. `frontend-developer`, если задача затрагивает:
- page, component, layout, form, validation
- UX, state management, routing
- работу с API на клиенте

3. Обе роли, если задача сквозная:
- меняется API-контракт и одновременно UI
- новые поля/статусы приходят с backend и отображаются на frontend

При конфликте приоритета:
- сначала `backend-developer`
- затем `frontend-developer`
- затем `domain-rules-reviewer`, если есть доменные триггеры
- затем `plan-reviewer`

## Auto Routing Rules (Domain Logic)

В режиме `execute` запускать `domain-rules-reviewer` обязательно, если:
- меняются статусы и переходы доменных сущностей;
- меняются расчеты цен, скидок, итогов, SLA или иных бизнес-правил;
- меняется поведение критичных пользовательских потоков;
- меняются backend/frontend модули, которые являются source of truth для доменной логики.

Минимальный вход для `domain-rules-reviewer`:
1. diff изменений
2. текущий `DOMAIN_RULES.md`
3. короткое описание поведения "до/после"

## Hygiene For Planning

1. Active-файлы (`DEVELOPMENT_PLAN.md`, `NEXT_STEPS.md`) должны оставаться короткими.
2. Исторические completed-блоки переносить в `docs/planning/archive/`.
3. Перед крупной переработкой active-планов сохранять snapshot в архив.

## Контракт Между Ролями

Каждая роль обязана вернуть:

1. `Assumptions` — явные допущения.
2. `Decisions` — ключевые решения и почему.
3. `Output` — артефакт роли.
4. `Risks` — что может сломаться и как проверить.

## Правила Качества

- Не делать скрытых допущений.
- Не менять несвязанные части проекта.
- Для кода: минимум один способ верификации.
- Для планов: шаги должны быть проверяемыми и конечными.

## Минимальный Формат Ответа От Агента

```md
Role: <planner|architect|backend-developer|frontend-developer|domain-rules-reviewer|plan-reviewer>
Assumptions:
- ...
Decisions:
- ...
Output:
- ...
Risks:
- ...
```
