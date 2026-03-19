# .agents

Локальные role-skills проекта.

## Как использовать

1. Откройте корневой `AGENTS.md`.
2. Определите обязательную последовательность ролей по workflow из `AGENTS.md`.
3. Запускайте `SKILL.md` каждой роли в порядке, требуемом этим workflow.
4. Передавайте результат следующей роли в формате `Assumptions / Decisions / Output / Risks`.

## Быстрый Маппинг Ролей

- `planner` — строит исполнимый план.
- `architect` — валидирует архитектурные решения и риски.
- `domain-reviewer` — валидирует бизнес-инварианты и доменную корректность.
- `backend-developer` — реализует серверные изменения.
- `frontend-developer` — реализует клиентские изменения.
- `plan-reviewer` — сверяет план и реализацию, выдает вердикт.

## Обязательный Контекст

- `DEVELOPMENT_PLAN.md` — active стратегия.
- `NEXT_STEPS.md` — active backlog.
- `DOMAIN_RULES.md` — обязательный доменный контекст для задач, затрагивающих бизнес-правила, статусы, расчеты и инварианты.
- `docs/planning/archive/` — история и старые snapshot-планы.

## Шаблоны

- Plan review report: `.agents/templates/plan-review-report.md`

## Локальные Запуски

- Папка артефактов: `.agents/runs/`
- Создать новую run-папку:
  - `scripts/agents/new-run.sh "task name"`
