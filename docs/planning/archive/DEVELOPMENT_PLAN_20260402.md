# DEVELOPMENT_PLAN (Active)

Этот файл содержит только актуальный стратегический план.
История и завершенные крупные блоки выносятся в `docs/planning/archive/`.

- Active plan owner: `planner` + `architect`
- Last updated: `2026-03-27`
- Archive: `docs/planning/archive/`
- Status: `m2 completed | m3 reporting and documents — next`

## 1) Product Goal
Собрать с нуля устойчивую `car-service-platform` для учета работ автосервиса, работы с клиентами и автомобилями, ведения истории ремонтов и формирования итоговых документов.

Продукт должен закрывать базовый операционный цикл сервиса:
- хранение базы клиентов и автомобилей
- хранение справочника автомобилей для выбора марки, модели и года
- создание и сопровождение ремонтов
- выдачу клиенту tracking-кода для проверки статуса ремонта без отдельного кабинета
- фиксация проблем, работ, запчастей и поставщиков
- хранение фото процесса ремонта
- ведение месячной истории работ
- формирование акта выполненных работ

## 2) Current Baseline
- Репозиторий инициализирован, CI настроен, docker-compose + gunicorn + nginx в production-режиме.
- Полный backend CRUD: `Customer`, `Vehicle`, `Repair`, `RepairNote`, `Purchase`, `Supplier`, `Service`.
- REST API покрыт тестами: **57 backend + 8 frontend smoke tests**.
- Роли `admin` / `staff` реализованы на уровне API (ownership, queryset scoping, perform_create guard).
- Ремонты: backend-backed flow, tracking code `TOR-{id:04d}` генерируется на сервере, note history с авторством, смена статуса через drag-and-drop.
- Purchases: API с auto-create supplier по имени, привязка к vehicle и repair_code.
- Services: справочник услуг с API, frontend использует реальные записи вместо hardcoded presets.
- Vehicle: поля `mileage`, `last_service_date`, `added_date` синхронизированы с backend.
- Фото ремонта: кнопки UI присутствуют, upload отключён (деferred до выбора хранилища — MinIO / S3).
- Staff frontend: экраны Vehicles, Repairs, Purchases, Users; drag-and-drop kanban; mobile list/detail.
- Admin: Unfold admin, кастомный sidebar, clickable invoice_url, assigned_to в списке клиентов.
- `StaffHomePage.tsx` рефакторен: выделены `usePurchases` и `useRepairs` custom hooks (3442 → 2904 строк).
- Invite-based user registration: InviteToken model, invite/accept flow, admin UI with copyable link.
- DB backup/restore scripts (`scripts/db-backup.sh`, `scripts/db-restore.sh`), auto-backup on rebuild.
- Docker log rotation configured (json-file, max 25m/10m per service), `scripts/show-logs.sh` for agent log access.
- Demo data: `demo/demo_data.sql` + `scripts/load-demo.sh` for loading sample entities.
- Весь технический долг закрыт: TD-01 — TD-18.
- `Dashboard` реализован как операционная сводка (moneyflow + service board tabs).

## 3) Product Scope (MVP Baseline)
MVP первой версии должен включать:

1. Dashboard
- краткая операционная сводка по машинам, клиентам, ремонтам и недавним действиям

2. Vehicles Registry
- реестр автомобилей
- справочник автомобилей для выбора марки, модели, варианта и года из списка
- поиск по номеру и клиенту
- фильтры по машине и месяцу обслуживания
- переход в карточку автомобиля
- на будущее: VIN-enrichment через внешний API после отдельного подтверждения

3. Customers Registry
- реестр клиентов
- карточка клиента
- список автомобилей клиента
- история обращений

4. Repair Workflow
- создание записи ремонта
- создание отдельного repair order на одно обращение / один кейс обслуживания
- генерация отдельного tracking code для клиента
- фиксация даты обращения и описания проблемы
- загрузка фото до, во время и после ремонта
- mobile-first сценарий для фото: открыть камеру, сделать снимок, догрузить новые фото и удалить лишние
- добавление работ, запчастей и поставщиков
- хранение комментариев мастера
- клиент не получает отдельный кабинет, доступ к статусу идет только по tracking code

5. Vehicle Repair History
- история работ по автомобилю
- детализация по датам, работам, поставщикам, запчастям и итоговым суммам

6. Monthly History
- срез по месяцу
- фильтры по клиенту и машине
- агрегаты по сумме работ, сумме запчастей, количеству машин и количеству клиентов

7. Supplier Tracking
- фиксация заказов у поставщиков внутри ремонта
- для каждой позиции хранить дату заказа, деталь, закупочную цену, количество, сумму закупки, цену продажи клиенту и привязку к ремонту / автомобилю
- при необходимости хранить связь с конкретной строкой работы
- отчет по поставщикам: количество заказов и общая сумма

8. Completion Act
- формирование акта выполненных работ на основании завершенного ремонта
- отдельные блоки для работ, запчастей и итогов

## 4) Active Milestone
`M3: Reporting And Documents`

Цель milestone: реализовать отчётность и итоговые документы на основе накопленных данных из M2.

Milestone включает:
1. Месячная история работ: срез по месяцу, фильтры по клиенту и машине, агрегаты.
2. Отчёт по поставщикам: количество заказов и общая сумма закупок.
3. Акт выполненных работ: генерация на основании завершённого ремонта.
4. PDF-экспорт акта (если подтверждён как обязательный — см. open decisions).
5. Хранение фото ремонта: выбрать и реализовать хранилище (MinIO или S3-compatible).

## 5) Delivery Roadmap

### M0: Product Foundation + Delivery Skeleton
- product scope и active docs согласованы
- есть source-of-truth по ключевым сущностям и lifecycle
- есть source-of-truth по техническому стеку и access model
- CI, planning workflow и initial skeleton готовы
- current status: `completed`

### M1: Core Records
- клиенты, автомобили, связи клиент → автомобили
- базовые CRUD-операции, глобальный поиск
- current status: `completed`

### M2: Repair Operations
- backend-backed repair flow с tracking code `TOR-*`, статусами, мастером, note history
- purchases API с auto-create supplier, привязкой к vehicle
- services API, vehicle extra fields (mileage, last_service_date, added_date)
- весь технический долг (TD-01 — TD-18) закрыт
- 48 backend + 8 frontend тестов
- current status: `completed 2026-03-27`

### M3: Reporting And Documents
- месячная история работ
- агрегаты и сводки
- акты выполненных работ
- PDF-генерация (если подтверждена)
- хранение фото ремонта (MinIO / S3)
- current status: `next`

## 6) Acceptance Criteria
Milestone `M3` считается завершённым, если:
1. Есть страница месячной истории с фильтрами и агрегатами (сумма работ, запчастей, кол-во машин, клиентов).
2. Есть отчёт по поставщикам с количеством заказов и суммой.
3. Для завершённого ремонта можно сформировать акт выполненных работ.
4. Фото ремонта хранятся на сервере (не только в сессии браузера).

## 7) Constraints
- Не раздувать active-файлы историей.
- Любые критичные доменные допущения фиксировать явно.
- Не пытаться строить сразу весь ERP-слой автосервиса.
- Не включать в MVP склад, сотрудников, сложные оплаты и уведомления, пока это не подтверждено отдельным решением.
- До утверждения стека держать технические решения прагматичными и минимально достаточными.

## 8) Confirmed In Scope
- клиенты
- автомобили
- ремонты и история ремонтов
- tracking code для клиента без отдельного кабинета
- фото процесса ремонта
- работы и запчасти
- поставщики
- месячная история работ
- акт выполненных работ

## 9) Deferred / Open Decisions
- нужен ли PDF-экспорт акта в первой версии
- хранилище фото: MinIO (self-hosted) vs S3-compatible cloud
- может ли один ремонт содержать несколько отдельных проблем
- нужен ли VIN API enrichment после MVP
- нужно ли разделять note types на `client complaint`, `master note`, `admin note`
- нужен ли учет оплат клиента
- нужен ли склад запчастей
- нужны ли уведомления о ТО и ремонтах
- справочник марок/моделей автомобилей: внешний API или встроенный dataset

## 10) Source Of Truth Map
- Strategy (active): `DEVELOPMENT_PLAN.md`
- Execution backlog (active): `NEXT_STEPS.md`
- Domain rules: `DOMAIN_RULES.md`
- Technical baseline: `TECH_STACK.md`
- History: `docs/planning/archive/`

## 11) Access Model

Роли пользователей: `admin`, `staff`.

| Role  | Navigation | Data Access |
|-------|-----------|-------------|
| admin | все вкладки: dashboard, customers, vehicles, repairs, purchases, users | все клиенты, все автомобили, все ремонты |
| staff | только vehicles и repairs | только назначенные клиенты (`Customer.assigned_to`) и их автомобили |

Правила:
- Staff создаёт клиента → клиент автоматически привязывается к нему (`assigned_to = request.user`)
- Admin создаёт клиента → `assigned_to = null` (виден всем admins)
- Staff создаёт vehicle → проверяется, что customer принадлежит request.user (иначе 403)
- Staff обращается к чужому customer по ID → 404 (queryset скоупирован, не 403)
- Repairs: backend-backed, staff видит все ремонты (фильтрация по роли — open decision для M3)

Создание пользователей:
- Admin приглашает нового пользователя → генерируется InviteToken (7 дней) → ссылка отображается в UI и отправляется на email → пользователь устанавливает пароль по ссылке `/invite/accept?token=...`.

UI-ограничения для staff:
- Vehicle detail: скрыты кнопки Edit Vehicle и Delete Vehicle
- Customer detail: скрыты кнопки Edit Customer и Delete Customer
- Repair detail: скрыта кнопка Delete Repair, поле Master отображается как текст (без возможности переназначения)
