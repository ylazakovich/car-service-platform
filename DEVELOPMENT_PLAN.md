# DEVELOPMENT_PLAN (Active)

Этот файл содержит только актуальный стратегический план.
История и завершенные крупные блоки выносятся в `docs/planning/archive/`.

- Active plan owner: `planner` + `architect`
- Last updated: `2026-03-18`
- Archive: `docs/planning/archive/`
- Status: `m2 repair operations prototype in progress | staff role separation implemented`

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
- Репозиторий инициализирован.
- Базовый CI-каркас добавлен.
- Локальный agent workflow добавлен.
- Есть исходное product vision из `plan_autoservice_product.docx`.
- Зафиксирован рекомендуемый technical baseline в `TECH_STACK.md`.
- Поднят минимальный runnable skeleton: `backend`, `frontend`, `docker-compose`, `.env.example`, `start/stop` scripts.
- Active planning docs переведены из template-состояния в стартовый project foundation.
- Реализован первый доменный slice: `Customer + Vehicle` с backend CRUD, Django Admin и staff UI registries.
- Staff frontend получил рабочие экраны `Customers`, `Vehicles`, `Repairs`, `Purchases`, `Users` с локальными demo flows для валидации продукта.
- Во frontend реализован repair prototype: intake form, tracking code формата `TOR-*`, выбор мастера, фото `before/during/after`, статусы и modal repair card.
- Во frontend реализован purchases prototype: optional vehicle / tracking / sale price, сценарий закупки в склад без привязки к ремонту.
- `Dashboard` пока оставлен намеренно пустым до фиксации итоговой операционной структуры.
- Реализовано разделение ролей: admin видит все данные, staff видит только своих клиентов и их автомобили, навигация staff ограничена вкладками Vehicles и Repairs.
- Staff ограничен в правах UI: не может редактировать и удалять vehicle/customer записи, не может удалять repair карточки и переназначать мастера.

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
`M2: Repair Operations Prototype`

Цель milestone: перевести проект от базовых реестров к первому рабочему staff flow для ремонтов, закупок и назначения мастеров.

Milestone включает:
1. Довести `RepairOrder` от frontend prototype до backend-backed flow.
2. Зафиксировать source-of-truth по статусам ремонта, tracking code `TOR-*`, фото и note history.
3. Реализовать назначение мастера на ремонт как часть операционного потока.
4. Довести `Purchases` до реального учета деталей с привязкой или без привязки к ремонту.
5. Подготовить переход к полным карточкам автомобиля и клиента с реальной историей ремонтов.

## 5) Delivery Roadmap

### M0: Product Foundation + Delivery Skeleton
- product scope и active docs согласованы
- есть source-of-truth по ключевым сущностям и lifecycle
- есть source-of-truth по техническому стеку и access model
- CI, planning workflow и initial skeleton готовы

### M1: Core Records
- клиенты
- автомобили
- справочник автомобилей для выбора из списка
- связи клиент -> автомобили
- базовые CRUD-операции
- глобальный поиск по номеру машины и клиенту
- current status: `completed in current baseline`, backend CRUD и staff registry UI уже реализованы

### M2: Repair Operations
- создание ремонта
- tracking code и публичная проверка статуса по коду
- baseline статусы `new`, `in_progress`, `waiting_parts`, `completed`
- фото процесса
- mobile-friendly photo capture/upload/delete flow
- note history по ремонту с авторством
- назначение мастера на ремонт
- работы
- запчасти
- поставщики
- история ремонта и карточка автомобиля
- current status: `frontend prototype in progress`, persistence и backend API еще впереди

### M3: Reporting And Documents
- месячная история работ
- агрегаты и сводки
- акты выполненных работ
- подготовка PDF-генерации, если она подтверждена как обязательная

## 6) Acceptance Criteria
Milestone `M2` считается завершенным, если:
1. Можно создать ремонт для автомобиля и клиента через backend-backed flow.
2. Для ремонта есть tracking code формата `TOR-*`, статус, мастер и issue notes.
3. Для ремонта можно хранить фото `before`, `during`, `after`.
4. Repair notes ведутся как append-only история с автором и временем создания.
5. Закупки деталей можно вести как с привязкой к ремонту, так и в запас без привязки.
6. Карточка клиента и автомобиля показывает реальные ремонты, а не только demo placeholders.
7. Frontend и backend покрыты smoke-check сценарием `customer -> vehicle -> repair -> update status -> purchase`.

## 7) Constraints
- Не раздувать active-файлы историей.
- Любые критичные доменные допущения фиксировать явно.
- Не пытаться строить сразу весь ERP-слой автосервиса.
- Не включать в MVP склад, сотрудников, сложные оплаты и уведомления, пока это не подтверждено отдельным решением.
- До утверждения стека держать технические решения прагматичными и минимально достаточными.

## 8) Confirmed In Scope
- клиенты
- автомобили
- справочник автомобилей для выбора марки/модели/года
- ремонты и история ремонтов
- tracking code для клиента без отдельного кабинета
- фото процесса ремонта
- работы и запчасти
- поставщики
- месячная история работ
- акт выполненных работ

## 9) Deferred / Open Decisions
- нужен ли PDF-экспорт акта в первой версии
- нужно ли хранить email клиента
- может ли один ремонт содержать несколько отдельных проблем
- нужен ли VIN API enrichment после MVP
- нужно ли разделять note types на `client complaint`, `master note`, `admin note`
- нужен ли учет оплат клиента
- нужен ли склад запчастей
- нужны ли уведомления о ТО и ремонтах

## 10) Source Of Truth Map
- Strategy (active): `DEVELOPMENT_PLAN.md`
- Execution backlog (active): `NEXT_STEPS.md`
- Domain rules: `DOMAIN_RULES.md`
- Technical baseline: `TECH_STACK.md`
- History: `docs/planning/archive/`

## 11) Access Model

Роли пользователей: `admin`, `staff`. Роль `manager` удалена.

| Role  | Navigation | Data Access |
|-------|-----------|-------------|
| admin | все вкладки: dashboard, vehicles, repairs, purchases, users | все клиенты, все автомобили |
| staff | только vehicles и repairs | только назначенные клиенты (`Customer.assigned_to`) и их автомобили |

Правила:
- Staff создает клиента → клиент автоматически привязывается к нему (`assigned_to = request.user`)
- Admin создает клиента → `assigned_to = null` (виден всем admins)
- Repairs пока frontend-only, фильтрация будет добавлена после бэкенда M2

UI-ограничения для staff:
- Vehicle detail: скрыты кнопки Edit Vehicle и Delete Vehicle
- Customer detail: скрыты кнопки Edit Customer и Delete Customer
- Repair detail: скрыта кнопка Delete Repair, поле Master отображается как текст (без возможности переназначения)
