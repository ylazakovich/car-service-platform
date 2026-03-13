# NEXT_STEPS (Active)

Только актуальный backlog. Историю и закрытые большие блоки переносить в `docs/planning/archive/`.

- Last updated: `2026-03-13`
- Status: `project bootstrap`

## NOW
- [ ] Подтвердить MVP baseline, зафиксированный в `DEVELOPMENT_PLAN.md`, как рабочий scope первой версии.
- [ ] Утвердить core entities и связи из `DOMAIN_RULES.md`: `Customer`, `Vehicle`, `RepairOrder`, `RepairWork`, `RepairPart`, `Supplier`, `CompletionAct`, `RepairPhoto`.
- [ ] Подтвердить основной lifecycle ремонта и минимальные статусы первой версии.
- [ ] Подтвердить `TECH_STACK.md` как baseline: `Django + DRF + React + Vite + PostgreSQL`.
- [ ] Утвердить access model: `Django Admin` для служебного управления, `Staff App` для сотрудников, `Client Portal` для клиентов.
- [ ] Принять решения по открытым вопросам: `PDF`, `email клиента`, `multiple problems per repair`, `payments`, `employees`, `inventory`, `notifications`.
- [ ] Подготовить список reusable technical blocks, которые переносим из `f-cmr-template`, без переноса invoice domain logic.
- [ ] Подготовить минимальный skeleton проекта, который реально сможет проходить CI.

## NEXT
- [ ] Перетащить и адаптировать backend/frontend bootstrap из `f-cmr-template`.
- [ ] Перетащить и адаптировать docker/env/scripts foundation из `f-cmr-template`.
- [ ] Реализовать базовые модели и CRUD для клиентов и автомобилей.
- [ ] Реализовать создание ремонта с описанием проблемы, датой обращения и комментариями.
- [ ] Реализовать добавление работ, запчастей, поставщиков и фотографий в ремонт.
- [ ] Подготовить карточку автомобиля с историей ремонтов.
- [ ] Подготовить карточку клиента со списком автомобилей и историей обращений.
- [ ] Добавить первый end-to-end flow: `создать клиента -> добавить авто -> создать ремонт`.
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
- Пока проект на нулевой стадии, `NOW` должен закрыть не код ради кода, а продуктовый и архитектурный baseline.
