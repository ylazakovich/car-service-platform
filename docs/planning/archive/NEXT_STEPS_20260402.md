# NEXT_STEPS (Active)

Только актуальный backlog. Историю и закрытые большие блоки переносить в `docs/planning/archive/`.

- Last updated: `2026-03-14`
- Status: `m2 repair operations prototype in progress`

## NOW
- [ ] Поднять backend-модели и API для `RepairOrder`, repair statuses, tracking code `TOR-*`, assigned master и photo groups.
- [ ] Поднять backend-модели и API для `Purchases` с optional linkage на repair/vehicle и сценарием закупки в запас.
- [ ] Перевести frontend repair modal с demo-state на реальное сохранение в backend.
- [ ] Перевести frontend purchases screen с demo-state на реальное сохранение в backend.
- [ ] Зафиксировать note policy: issue note read-only, repair notes append-only с автором/временем, delete only by author.
- [ ] Реализовать реальный список мастеров и роли вместо placeholder credentials.
- [ ] Подтвердить или скорректировать baseline repair statuses `new`, `in_progress`, `waiting_parts`, `completed` и allowed transitions перед backend rollout.
- [ ] Принять решения по открытым вопросам: `PDF`, `email клиента`, `multiple problems per repair`, `payments`, `inventory`, `notifications`.

## NEXT
- [x] Реализовать базовые модели и CRUD для клиентов и автомобилей.
- [x] Реализовать frontend prototype для `Repairs`, `Purchases` и `Users`.
- [x] Добавить demo tracking flow с кодами формата `TOR-*`.
- [x] Добавить frontend note history и выбор мастера в repair modal.
- [ ] Реализовать справочник автомобилей для выбора марки, модели, варианта и года.
- [ ] Реализовать публичную страницу/экран проверки статуса ремонта без client account.
- [ ] Подготовить карточку автомобиля с реальной историей ремонтов.
- [ ] Подготовить карточку клиента с реальной историей обращений.
- [ ] Добавить первый end-to-end flow: `создать клиента -> добавить авто -> создать ремонт -> обновить статус -> добавить закупку`.
- [ ] Добавить smoke tests для backend/frontend и включить их в CI.

## LATER
- [ ] Реализовать месячную историю работ и агрегаты по суммам, машинам и клиентам.
- [ ] Реализовать отчетность по поставщикам.
- [ ] Реализовать генерацию акта выполненных работ.
- [ ] Добавить PDF-экспорт, если он останется в confirmed scope.
- [ ] Добавить observability, auditing и операционные runbooks.
- [ ] Детализировать интеграции, уведомления, оплаты и склад, если они войдут в roadmap.

## Notes
- Этот файл намеренно короткий.
- Текущий переходный этап: frontend prototype уже собран, `NOW` должен перевести его в backend-backed операционный поток без потери согласованных правил.
