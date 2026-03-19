# Plan Review Report

- Date: `<YYYY-MM-DD>`
- Reviewer role: `plan-reviewer`
- Reviewed scope: `<short summary>`
- Input artifacts:
  - Plan: `<path or reference>`
  - Architecture notes: `<path or reference>`
  - Implementation diff: `<path or reference>`
  - Domain review (plan): `<path or n/a>`
  - Domain review (final): `<path or n/a>`
- Verdict: `<approved|changes_required>`

## Plan Coverage

| Plan Step | Status (`done`/`partial`/`missed`) | Evidence (file/test/behavior) | Notes |
| --- | --- | --- | --- |
| S1 |  |  |  |
| S2 |  |  |  |
| S3 |  |  |  |

## Findings

### Critical
- `<none or issue>`

### Major
- `<none or issue>`

### Minor
- `<none or issue>`

## Regression Risks
- `<risk and how to verify>`

## Required Fixes
1. `<required change or n/a>`

## Final Checklist
- [ ] Все обязательные шаги плана закрыты.
- [ ] Архитектурные ограничения соблюдены.
- [ ] Для `mode: plan` задач с критичной доменной логикой приложен обязательный `domain-review-plan.md`.
- [ ] Для `mode: execute` задач, изменяющих доменную логику, приложены оба обязательных артефакта: `domain-review-plan.md` и `domain-review-final.md`.
- [ ] Есть верификация (тест, сборка или ручной сценарий).
