# Planning Docs Lifecycle

## Цель
Держать активный контекст коротким и устойчивым для агентной работы.

## Active Files (SDD)
- `docs/spec/PRODUCT.md` — стратегия и приёмочные темы.
- `docs/spec/TASKS.md` — backlog с идентификаторами `T-*` (секции NOW/NEXT/LATER внутри файла).
- `docs/spec/OPEN_QUESTIONS.md` — открытые решения.
- Корневые `DEVELOPMENT_PLAN.md` и `NEXT_STEPS.md` — короткие указатели на `docs/spec/` (удобные старые пути).

## Archive
- Путь: `docs/planning/archive/`
- Формат снапшотов: `<FILE>_YYYYMMDD.md`
- В архив уходит:
  - длинный completed log
  - устаревшие этапы и подпланы
  - старые версии milestone

## Правила Обновления
1. Перед крупной переработкой active-планов сохранить снапшоты в архив.
2. Не держать в active-файлах длинные исторические разделы.
