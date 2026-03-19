# Agent Workflow (Project-Local)

Этот проект использует локальные agent skills из папки `.agents`.

Цель: единый workflow для планирования, реализации и верификации изменений в `car-service-platform` без привязки к одному ассистенту.

## Структура

- `.agents/planner/SKILL.md` — декомпозиция задачи и исполнимый план.
- `.agents/architect/SKILL.md` — проверка архитектурной целостности.
- `.agents/domain-reviewer/SKILL.md` — проверка доменной корректности и бизнес-инвариантов.
- `.agents/backend-developer/SKILL.md` — реализация серверной части.
- `.agents/frontend-developer/SKILL.md` — реализация клиентской части.
- `.agents/plan-reviewer/SKILL.md` — финальная сверка плана и результата.

## Обязательные Источники Контекста

- `DEVELOPMENT_PLAN.md` — active стратегический план.
- `NEXT_STEPS.md` — active backlog (`NOW/NEXT/LATER`).
- `DOMAIN_RULES.md` — канонический источник доменных правил, статусов, расчетов и инвариантов.
- `docs/planning/archive/` — архив завершенных этапов и snapshot-планов.

## Обязательный Порядок Работы

1. Создать `RUN_DIR` в `.agents/runs/<YYYYMMDD-HHMMSS>-<task-slug>/`.
2. Прочитать задачу и ограничения.
3. Запустить `planner` для пошагового плана.
4. Прогнать план через `architect`.
5. Если задача затрагивает бизнес-правила, статусы, доменные ограничения или расчеты, прогнать план через `domain-reviewer`.
6. Реализовать изменения через `backend-developer` и/или `frontend-developer`.
7. Если доменная логика менялась, прогнать итог через `domain-reviewer`.
8. Прогнать итог через `plan-reviewer`.
9. Вернуть результат с кратким changelog и остаточными рисками.

Примечание по совместимости:
- `DOMAIN_RULES.md` мог ранее ссылаться на роль `domain-rules-reviewer`; в текущем workflow это имя заменено на `domain-reviewer`.

Форматы выходных отчетов:
- `plan-reviewer` -> `.agents/templates/plan-review-report.md`

## Локальное Хранение Артефактов

- База: `.agents/runs/`
- Один запуск = одна папка `RUN_DIR`
- Рекомендуемый helper:
  - `scripts/agents/new-run.sh "task name"`

Сохранять в `RUN_DIR`:
- `planner.md`
- `architect.md`
- `domain-review-plan.md` (если был pre-implementation domain review)
- `domain-review-final.md` (если был post-implementation domain review)
- `backend-developer.md` (если роль участвовала)
- `frontend-developer.md` (если роль участвовала)
- `plan-review-report.md`
- `final-summary.md`

## Режимы

- `mode: plan` — агент строит или уточняет план, код не меняет.
- `mode: execute` — агент реализует задачу по утвержденному плану.

Если режим не указан явно:
- если нет пошагового плана или задача сформулирована как исследование/дизайн -> `plan`
- если есть утвержденный план и запрос на реализацию -> `execute`

## Auto Routing Rules

В режиме `execute` агент сначала обязан пройти все mandatory review stages из раздела `Обязательный Порядок Работы`, а правила ниже применяются только после этого — чтобы выбрать implementation role(s) и определить порядок review/rework при нескольких кандидатах.

1. `backend-developer`, если задача затрагивает:
- API, endpoint, controller, service, repository
- DB, schema, migration, query, transaction
- auth, permissions, integrations, бизнес-правила

2. `domain-reviewer`, если задача затрагивает:
- бизнес-правила, workflow, state machine, статусы
- расчеты, eligibility, ограничения, инварианты
- терминологию предметной области и правила согласованности данных

3. `frontend-developer`, если задача затрагивает:
- page, component, layout, form, validation
- UX, state management, routing
- работу с API на клиенте

4. Обе роли, если задача сквозная:
- меняется API-контракт и одновременно UI
- новые поля/статусы приходят с backend и отображаются на frontend
- доменные статусы или правила проходят через backend и отображаются на frontend

При конфликте приоритета:
- сначала `backend-developer`
- затем `domain-reviewer`
- затем `frontend-developer`
- затем `plan-reviewer`

Важно:
- если задача затрагивает бизнес-правила, статусы, расчеты, eligibility, ограничения или инварианты, `domain-reviewer` обязателен до реализации согласно mandatory workflow выше;
- указанный приоритет не отменяет обязательные pre-implementation и post-implementation review stages.

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
Role: <planner|architect|domain-reviewer|backend-developer|frontend-developer|plan-reviewer>
Assumptions:
- ...
Decisions:
- ...
Output:
- ...
Risks:
- ...
```
