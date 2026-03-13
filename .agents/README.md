# .agents

Локальные role-skills проекта.

## Как использовать

1. Откройте корневой `AGENTS.md`.
2. Выберите роль по задаче.
3. Следуйте `SKILL.md` выбранной роли.
4. Передайте результат следующей роли в формате `Assumptions / Decisions / Output / Risks`.

## Быстрый Маппинг Ролей

- `planner` — строит исполнимый план.
- `architect` — валидирует архитектурные решения и риски.
- `backend-developer` — реализует серверные изменения.
- `frontend-developer` — реализует клиентские изменения.
- `domain-rules-reviewer` — проверяет соответствие `DOMAIN_RULES.md`.
- `plan-reviewer` — сверяет план и реализацию, выдает вердикт.

## Обязательный Контекст

- `DEVELOPMENT_PLAN.md` — active стратегия.
- `NEXT_STEPS.md` — active backlog.
- `DOMAIN_RULES.md` — source of truth для доменной логики.
- `docs/planning/archive/` — история и старые snapshot-планы.

## Шаблоны

- Domain compliance report: `.agents/templates/domain-compliance-report.md`
- Plan review report: `.agents/templates/plan-review-report.md`

## Локальные Запуски

- Папка артефактов: `.agents/runs/`
- Создать новую run-папку:
  - `scripts/agents/new-run.sh "task name"`
