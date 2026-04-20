# DEVELOPMENT_PLAN (Active)

Этот файл содержит только актуальный стратегический план.
История и завершенные крупные блоки выносятся в `docs/planning/archive/`.

- Active plan owner: `planner` + `architect`
- Last updated: `2026-04-10`
- Archive: `docs/planning/archive/`
- Status: `m2 completed | m3 in progress — PDF persist + snapshot + portal + dashboard (MoneyFlow / Procurement / ServiceBoard / Consumables); Registers (admin): функциональный срез UoM + Services + customers-with-vehicles + E2E/CI; **UX Registers — не закрыт на 100%** (полировка и согласованность — см. `NEXT_STEPS.md`); purchases bulk + shop consumables вне акта; E2E+CI — docs/testing/playwright-e2e-framework.md | в backlog: MoneyFlow buy/sale/margin сводка, No invoice/No vehicles, CMR, masters link, OCR/PO, staff vehicle-only PII, calendar`

## 1) Product Goal
Собрать устойчивую `car-service-platform`, которая закрывает не только операционный цикл автосервиса, но и аналитический контур после завершения ремонта: итоговые документы, финансовые срезы и историческую отчётность.

Продукт должен покрывать:
- хранение базы клиентов и автомобилей
- создание и сопровождение ремонтов
- фиксацию работ, запчастей, закупок и связанных расходов
- выдачу клиенту tracking-кода для проверки статуса ремонта
- формирование итоговых документов по завершенному ремонту
- накопление исторических финансовых snapshot-данных для аналитики

## 2) Current Baseline
- Репозиторий инициализирован, CI настроен, docker-compose + gunicorn + nginx работают в production-режиме.
- Полный backend CRUD реализован для `Customer`, `Vehicle`, `Repair`, `RepairNote`, `Purchase`, `Supplier`, `Service`.
- REST API покрыт тестами: **100+ backend** (django test) **+ frontend unit/e2e** (Vitest; Playwright для сценария PDF).
- Роли `admin` / `staff` реализованы на уровне API (ownership, queryset scoping, perform_create guard).
- Repair flow переведен на backend: tracking code `TOR-{id:04d}` генерируется на сервере, note history сохраняется с авторством, смена статуса работает через drag-and-drop.
- Purchases и Services уже имеют реальные API и используются frontend-частью вместо demo-state.
- Vehicle-поля `mileage`, `last_service_date`, `added_date` синхронизированы с backend.
- `Dashboard`: вкладка **MoneyFlow** показывает live-оценку (услуги из API, запчасти/закупки) и агрегаты по **последнему PDF/snapshot** за период + график (в т.ч. по дням экспорта); **Procurement** — топ поставщиков, несвязанные закупки, экспорты по сотруднику; **ServiceBoard** — воронка, cycle time, превью очередей; **Consumables** — KPI по строкам `is_shop_consumable` (см. `DOMAIN_RULES.md`). Исторический «срез на дату в прошлом» как отдельный UX ещё не сделан.
- **Registers (admin only):** вкладка **Settings → Registers** — **Units of measure** (справочник для закупок, drag-reorder), **Services** (каталог с ценами, инлайн-редактирование), **Customers with vehicles** (контакты без отдельного глобального customer registry в этой секции). Staff эту секцию не видит. Функционально и тестами покрыто; **продуктовый UX-проход** (пустые состояния, ошибки, мобильная ширина, единообразие с остальным UI, копирайт EN-only) — в работе по `NEXT_STEPS.md`.
- **Purchases:** строки связаны с **`UnitOfMeasure`**; **`POST /api/purchases/bulk/`** создаёт несколько строк с общими полями заказа; флаг **`is_shop_consumable`** — расходники мастерской, **не** попадают в completion PDF / financial snapshot; список — **Purchases → Consumables** и сводка на **Dashboard → Consumables**.
- **Отображение телефонов (витрина):** helper `formatPolishPhone` / `+48 …` на выбранных staff/admin surfaces (см. `frontend/src/lib/formatPolishPhone.ts`).
- **Планируемое разделение Purchases ↔ Dashboard:** с экрана **Purchases** убраны сводка **Displayed / Buy / Sale / Margin** и клиентские фильтры **No invoice** / **No vehicle** — их переносят в аналитический контур: сводка закупок по выбранному периоду — во **вкладку MoneyFlow**; списки/метрики закупок без инвойса и без привязки к авто — в **отдельную подвкладку Dashboard** (не дублировать как фильтры в основном списке закупок).
- **M3 slice (ветка `feature/m3-pdf-snapshot-persist`):** модели `RepairDocument` + `RepairFinancialSnapshot`, файлы PDF в media, расчёт сумм в одном месте (`financial_totals`). API: `GET /repairs/<id>/pdf/` — последняя выгрузка без новой версии; `POST /repairs/<id>/pdf/export/` — новая версия + snapshot. UI: View PDF, в модалке — Export new version. E2E Playwright: повторный просмотр не дублирует POST export.
- Фото ремонта на UI присутствуют, но upload остается deferred до выбора постоянного хранилища.
- Технический долг M2 закрыт; платформа готова к переходу в отчетность и документы.

## 3) Product Scope (Current MVP)
Текущий MVP должен включать:

1. Операционный контур
- реестры клиентов и автомобилей
- repair workflow со статусами, notes, закупками и сервисами
- история ремонта по автомобилю

2. Документы и финансовые данные
- completion document для завершенного ремонта
- PDF-выгрузку со страницы ремонта после статуса `completed`
- хранение версии выгруженного PDF и его финансового snapshot

3. Аналитика
- главный аналитический dashboard на основе сохраненных snapshot-данных
- возможность вернуться к историческому состоянию аналитики
- monthly history и supplier reporting, согласованные с тем же финансовым source of truth

4. QuickFocus / VPR Creation Flow
- при создании нового VPR пользователь может не только выбрать существующий `Vehicle`, но и создать новый прямо в этом сценарии
- если при создании нового `Vehicle` отсутствует нужный клиент, пользователь может создать и `Customer` без выхода из QuickFocus flow
- inline-создание должно повторять валидные поля и инварианты страницы `Vehicle`, а не вводить упрощенную или несовместимую форму

5. Admin User Access Management
- на странице `Users` со стороны admin должен быть сценарий закрытия доступа для `staff`
- минимально необходимый сценарий: удалить аккаунт уволенного сотрудника
- до реализации нужно явно определить, удаляем ли мы пользователя физически, деактивируем его или поддерживаем оба варианта

6. Dashboard Service Board Calendar
- во вкладке `dashboard -> service_board` нужен большой календарный формат вместо только карточек и summary-метрик
- календарь должен строиться от текущего дня и фокусировать пользователя на текущем операционном окне
- статусы работ должны отображаться визуально: линиями, маркерами или другими понятными обозначениями на днях календаря
- обязательна легенда, объясняющая, что означает `in_progress`, `waiting_parts` и другие визуальные сигналы

7. Dashboard Money Flow Default Date Range
- во вкладке `dashboard -> moneyflow` `EndDate` при каждом открытии должен быть равен текущему дню
- `StartDate` при каждом открытии должен быть равен `current day - 30 days`
- это должен быть стабильный default на каждый новый заход, без сохранения старого пользовательского диапазона как стартового состояния

8. Staff Vehicle-Only Access Model
- `staff` должен видеть весь доступный реестр `Vehicles`, а не только машины назначенных клиентов
- при этом `staff` не должен видеть имя клиента, телефон, email и другие customer-данные
- `staff` работает с машиной, историей ремонта и мастерами; работа с людьми остается только у `admin`

9. English-Only Product Surface
- весь пользовательский контур продукта переводится на **английский как единственный язык интерфейса**: staff/admin UI, клиентский portal (если присутствует), пользовательские тексты в ошибках API и валидации, шаблоны PDF/email, подписи в аналитике и дашбордах
- инженерная документация репозитория, активные планы (`DEVELOPMENT_PLAN`, `NEXT_STEPS`, `DOMAIN_RULES` и т.д.), комментарии в CI/E2E и сообщения для разработчиков — также на английском (исторические архивы в `docs/planning/archive/` можно не трогать или переводить по мере необходимости)
- критерий готовности: отсутствие смешанных RU/EN строк в production UI и в публичных контрактах, согласованная терминология с `DOMAIN_RULES.md` (после перевода — на английском)

10. CMR / Field App Alignment (см. `TECH_STACK.md` — reuse `f-cmr-template`)
- при добавлении услуги из CMR в API/синхронизацию **обязательно передавать и сохранять цену услуги** (`Service.price` или согласованный контракт line-item), чтобы прайс на вебе и в актах не расходился с полевым вводом
- **Django Admin** (`/admin/`, operational back-office): записи услуг, созданные через CMR, должны быть видны и редактируемы там же, что и остальные `Service` (единый source of truth в БД; устранить рассинхрон, если сейчас CMR пишет в другой канал/черновик без попадания в admin)
- **без загрузки фотографий** в сценарии CMR: убрать/не внедрять photo upload в полевом клиенте (отдельно от отложенного M4-хранилища фото в основном repair UI, если оно остаётся)

11. Dashboard: связность и расходники
- **связать первую и третью вкладки** дашборда (MoneyFlow и ServiceBoard) в части **мастеров**: единая семантика фильтра/дреллдауна или навигация «из сводки по мастеру → операционное представление на service board» (конкретный UX — зафиксировать в задаче)
- **расходники вне акта (baseline сделан):** флаг на строке закупки, исключение из PDF/snapshot, KPI на MoneyFlow, вкладки Dashboard/Purchases **Consumables** — см. `DOMAIN_RULES.md`; дальнейшие расширения модели — по продукту.

12. Закупки, инвойсы, поставщики
- **несколько строк в одном запросе:** реализовано через **`POST /api/purchases/bulk/`** (общие поля + `lines[]`); отдельная сущность «invoice document» в БД — при необходимости позже
- **извлечение данных со сканов/фото инвойса** (OCR / structured capture): товарные строки, цены, поставщик — с human-in-the-loop подтверждением до записи в БД
- экран/контур **Purchases**: возможность **создания заказа поставщику** и ведение **реестра поставщиков** (расширить текущий `Supplier` + UX заказа; не только auto-create из строки закупки)

13. Figma — дизайн-макет для шаринга с клиентами
- Цель: иметь готовый Desktop + Mobile Figma-макет, который можно открыть клиенту через view-only/comment ссылку, не показывая живое приложение.
- Инструмент: локальный Figma MCP fork (`tools/figma-mcp/`) + Figma plugin (dev mode).
- **Design System** (базис): 20 компонентов с Auto Layout, 15 color styles, 6 text styles — все создаются через MCP, не вручную.
- **Desktop mockup**: все `body`-фреймы заполняются component instances вместо raw-фреймов; экраны: Dashboard, Kanban, Purchases/Services list, UOM Admin, Vehicles Registry.
- **Mobile mockup** (393px): bottom nav, single-column card stacks, адаптация sidebar → drawer/hamburger.
- **Color tokens**: apply Color/Bg/* и Color/Text/* к fills/strokes фреймов после завершения instance-замен.
- **Шаринг**: Figma share link (view-only или comment-only) — клиент открывает в браузере без аккаунта, может оставлять комментарии прямо на макете.
- **Отслеживание**: все дизайн-решения фиксируются через Figma Annotations; структура страниц отражает реальные flow приложения.
- Технические детали и прогресс — в `NEXT_STEPS.md → Figma`.

## 4) Active Milestone
`M3: PDF Export, Analyst Dashboard, And Historical Snapshots`

Цель milestone: привязать завершенный ремонт к выгружаемому PDF-документу и сделать этот документ источником согласованной аналитики по ценам, работам и запчастям.

Milestone включает:
1. На странице `Repair` для статуса `completed` — просмотр последнего PDF и явная новая выгрузка (текущий UI: **View PDF** + **Export new version** в превью; первая выгрузка при отсутствии файла через POST export).
2. При **export** создается PDF с работами, запчастями, дополнительными позициями/расходами и итогами; каждая выгрузка — новая версия в БД.
3. PDF и snapshot привязаны к dashboard: `GET /api/analytics/dashboard/` агрегирует snapshot по правилам §3.1 `DOMAIN_RULES.md`; UI MoneyFlow + Procurement потребляет этот API.
4. Блоки по актам на дашборде используют сохранённый snapshot, связанный с PDF; live-блоки — клиентский расчёт из текущих ремонтов/закупок (предпросмотр до экспорта).
5. История snapshot-версий хранится в БД, чтобы можно было смотреть прошлые аналитические состояния.
6. Monthly history, supplier report и completion act выстраиваются поверх того же финансового источника истины.
7. QuickFocus flow создания нового VPR умеет inline создавать `Vehicle` и, при необходимости, `Customer`, по тем же правилам, что и основной vehicle workflow.
8. Admin users screen позволяет закрыть доступ `staff`, включая как минимум удаление аккаунта бывшего сотрудника.
9. Service board во вкладке dashboard показывает большой operational calendar с текущим фокусом, статусными обозначениями и легендой.
10. Money Flow во вкладке dashboard всегда открывается с диапазоном `today - 30 days` -> `today`.
11. Staff видит весь vehicle registry и repair history по машинам, но не получает доступ к customer identity и контактам.
12. **MoneyFlow:** в той же вкладке отображается сводка по закупкам за выбранный период (кол-во отображаемых/учтённых строк, сумма закупки, сумма продажи клиенту, маржа) — логическое место для метрик, ранее показанных на **Purchases**; источник данных и согласование с пагинацией/API фиксируются при реализации (предпочтительно серверный агрегат за период).
13. **Dashboard:** добавлена отдельная подвкладка для операционного контроля закупок **без инвойса** и **без привязки к автомобилю** (аналог бывших фильтров на **Purchases**), с возможностью перейти к записи закупки.
14. **Локализация:** продукт и активная инженерная документация переводятся на **английский** как единственный язык (см. §3 п.9).
15. **CMR:** цена услуги при синхронизации; услуги из CMR видны в Django Admin; без photo upload в CMR.
16. **Dashboard:** навигационная/фильтровая связь MoneyFlow ↔ ServiceBoard по мастерам; учёт расходников вне акта — **baseline** (вкладки Consumables, `DOMAIN_RULES.md`).
17. **Purchases / invoices:** мультилайн через **bulk API** — **сделано**; OCR/скан инвойса; заказы поставщикам; явный реестр поставщиков в UI — **в backlog**.
18. **Figma mockup:** Desktop + Mobile макет на component instances, sharable ссылка для клиентов, аннотации ключевых экранов — Design System создан (2026-04-10); instance-замены и Mobile mockup — в работе.

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
- services API, vehicle extra fields (`mileage`, `last_service_date`, `added_date`)
- технический долг M2 закрыт
- current status: `completed 2026-03-27`

### M3: PDF-Backed Reporting
- PDF-выгрузка завершенного ремонта (**сделано:** persist + versioned export; GET последней / POST новой версии)
- attachment PDF к аналитическому dashboard (**сделано:** read-only aggregates + UI)
- versioned financial snapshots в БД (**сделано** на уровне модели и записи при export)
- историческая аналитика по сохраненным snapshot-данным
- monthly history и supplier reporting на едином source of truth
- QuickFocus/VPR flow с inline-созданием `Vehicle` и `Customer`
- admin user management с revoke/delete flow для staff
- большой service board calendar в dashboard с визуализацией текущих repair statuses
- moneyflow default date range `today - 30 days` -> `today`
- staff vehicle-only visibility без customer PII
- расширение **MoneyFlow** сводкой по закупкам (buy/sale/margin, учёт строк за период) + новая **подвкладка Dashboard** «No invoice / No vehicles»
- **companion (функционально сделано, UX — доработка):** **Registers** (admin): UoM, Services, customers-with-vehicles; E2E Registers; **bulk purchases**; **shop consumables** вне акта + UI Consumables
- current status: `in progress` (pdf + snapshot + dashboard analytics slice; historical/monthly/supplier UI; MoneyFlow procurement summary / No invoice tab; **Registers UX polish** — дальше)

### M4: Deferred Media And Extended Reporting
- постоянное хранилище фото ремонта (MinIO / S3-compatible) — **для основного repair UI**; полевой CMR по продуктовому решению **без** загрузки фото (см. §3 п.10)
- **PDF акты завершения:** перенос бинарников `RepairDocument` в объектное хранилище (S3-compatible) вместо привязки к локальному `MEDIA_ROOT`/Docker volume — единая модель с фото, устойчивые URL/выдача для `GET …/pdf/` и export, миграция и бэкап на уровне бакета (см. `NEXT_STEPS` → PDF)
- расширенные финансовые сценарии: оплаты, скидки, налоги, inventory
- **Invoicing / procurement depth:** OCR инвойса, заказы поставщикам, опционально отдельный invoice-header в БД — см. `NEXT_STEPS` (мультилайн bulk и consumables baseline уже в M3 companion)
- current status: `later` (часть пунктов может выполняться параллельно M3 при приоритизации)

### M3 companion: надёжность E2E и CI (активный технический трек)

**Приоритет:** не ниже регрессии по dashboard/PDF: слабый E2E маскирует поломки M3. Источник правды по дизайну: `docs/testing/playwright-e2e-framework.md`.

Критические пробелы (закрываются задачами в `NEXT_STEPS.md`):

1. **Готовность стека:** CI опрашивает фронт и затем `GET /api/health` через тот же origin (`compose-up` + `e2e/global-setup.ts`); при регрессии см. `docs/testing/playwright-e2e-framework.md` §5.
2. **Детерминизм PDF-тестов:** загрузка `scripts/demo/demo_data.sql` не фиксирует наличие уже выгруженного PDF для выбранного ремонта; сценарии «idempotent View PDF» зависят от начального состояния БД — нужны явные фикстуры (два ремонта или расширение демо-SQL / отдельный фрагмент для E2E).
3. **Политика без ретраев:** `playwright.config.ts` — `retries: 0`; флаки устраняются ожиданиями состояния и данными, не повторным запуском.
4. **Глубина assert’ов:** smoke dashboard проверяет в основном заголовки; целевые проверки — KPI/виджеты после стабильных фикстур (см. framework doc).
5. **Новые экраны:** E2E **Registers** (`staff-registers.spec.ts`) добавлен; при изменении демо-услуг/клиентов — синхронизировать `e2e/e2e-seed.ts`. После UX-изменений в Registers — обновлять POM/ассерты при смене разметки или копирайта.

Агенты и MCP (без раздувания локального набора): `docs/dev/agents-and-mcp.md`. Восстановлен локальный skill `.agents/e2e-validator/SKILL.md` (раньше был указан в `AGENTS.md`, но отсутствовал в дереве).

### LATER: Allure-дерево, расширенная телеметрия отчёта

Не блокирует M3–M4 по функциям; пересекается с E2E-треком выше.

**Цель:** один Allure Report 3 с читаемым деревом Behaviors, понятным окружением прогона и возможностью «раскопать» E2E (trace / вложения).

1. **Окружение в отчёте**  
   - В отчёт попадают только переменные из **allowlist** (влияние на интерпретацию прогона): `CI`, `GITHUB_REF_NAME`, `PLAYWRIGHT_BASE_URL`, `NODE_ENV`, версии Node/Python/Django, признак что E2E запускался, и т.п.  
   - **Учётки и секреты не пишем в env отчёта:** не логируем `E2E_*_EMAIL`, `E2E_*_PASSWORD`, `DJANGO_SECRET_KEY`, токены и аналоги — только инфраструктурный контекст (URL, CI, версии, suite).  
   - Снимок `environment.properties` на шаге **Test Report** описывает раннер генерации HTML; для картины «где крутились тесты» — **фрагменты env с джоб PR Pipeline** (`Frontend.*`, `Backend.*`, `E2E.*`), склеиваемые перед финальной записью `environment.properties`.

2. **Дерево тестов (Behaviors)**  
   Согласовано с `groupBy: ["epic", "feature", "story"]` в `allure.config.mjs`:

   | Слой | Allure `epic` | `feature` | `story` |
   |------|---------------|-----------|---------|
   | UI (Playwright) | **END-TO-END** | роль: `admin` / `staff` | вкладка/экран: `dashboard · moneyflow`, `dashboard · procurement`, `dashboard · service_board`, `repair · pdf`, … |
   | HTTP API (pytest) | **api** | ресурс/модуль (`repairs`, `analytics`, `users`, …) | при необходимости сценарий / класс / marker |
   | Frontend unit (Vitest) | **unit** | зона кода (`API clients`, `Components`, …) | при росте дерева — компонент / хук |

   E2E покрывает admin-поверхности: dashboard (вкл. Consumables), repairs, PDF, **Registers** (units/services/customers); сценарии `staff` — без customer PII, фокус на vehicles/repairs.

3. **Отладка E2E в отчёте**  
   - **Playwright Trace** (zip) как вложение к кейсу в Allure + локальный просмотр `npx playwright show-trace <trace.zip>`.  
   - Политика trace в CI: `retain-on-failure` (или шире для выбранных спеков при необходимости).  
   - Опционально: artifact **Playwright HTML report** в GitHub Actions для полноэкранного viewer.  
   - Интеграция результатов Playwright в общий merge Allure (`report.yml`) вместе с Vitest и pytest.

## 6) Acceptance Criteria
Milestone `M3` считается завершённым, если:
1. На странице завершенного ремонта есть действие просмотра PDF и выгрузки новой версии, недоступные для незавершенных ремонтов (**частично закрыто:** View PDF / Export new version).
2. Выгрузка (export) создает PDF-документ с работами, запчастями, дополнительными затратами и итоговыми суммами (**закрыто** на стороне генератора + persist).
3. После выгрузки создается сохраненный финансовый snapshot и связь `repair -> exported PDF` (**закрыто**); привязка к **dashboard analytics** для MoneyFlow/Procurement — **закрыто** (read-only API + UI).
4. Дашборд считает суммы по сохранённым snapshot для блоков «по акту»; live-блоки используют текущий прайс услуг и строки закупок (**закрыто** для текущего scope).
5. Пользователь может открыть исторический период и увидеть аналитику, соответствующую данным на момент конкретной выгрузки (**частично**: выбор диапазона дат есть; отдельный UX «срез на момент версии» — TBD).
6. При создании нового VPR пользователь может, не покидая flow, найти существующий `Vehicle` либо создать новый `Vehicle`, а если у него нет клиента, то и нового `Customer`.
7. На admin-странице users можно закрыть доступ `staff`-пользователю, и система корректно обрабатывает связанные данные после увольнения сотрудника.
8. Во вкладке `service_board` есть большой календарь, который стартует от текущей даты и показывает статусные маркеры/линии по активным ремонтам, включая `in_progress` и `waiting_parts`, с понятной легендой.
9. Во вкладке `moneyflow` при каждом открытии `EndDate` равен текущему дню, а `StartDate` равен дате 30 дней назад, независимо от предыдущих выборов пользователя.
10. Staff видит все машины и их repair history, но не видит customer name, contact details и другие персональные данные клиента.
11. Во вкладке `moneyflow` видна сводка по закупкам за выбранный диапазон дат (в т.ч. buy / sale / margin и пояснение, что входит в подсчёт), согласованная с `DOMAIN_RULES.md` и не противоречащая блокам snapshot/live.
12. В dashboard есть отдельная подвкладка со списками/счётчиками закупок без прикреплённого инвойса и без привязанного автомобиля, с навигацией к деталям закупки; для `staff` — без утечки customer PII.

## 7) Constraints
- Active-файлы должны оставаться короткими и без архивной истории.
- Критичные доменные допущения по расчетам и версии данных фиксируются явно.
- Нельзя делать PDF единственным местом хранения аналитических цифр; нужны нормализованные snapshot-данные в БД.
- Нельзя строить историческую аналитику только из текущего состояния ремонта, если данные ремонта могут изменяться после выгрузки.
- Не включать в текущий milestone полноценный ERP-слой, склад и сложные оплаты без отдельного решения.

## 8) Confirmed In Scope
- клиенты
- автомобили
- ремонты и история ремонтов
- tracking code для клиента без отдельного кабинета
- работы, запчасти и поставщики
- completion document для завершенного ремонта
- PDF-выгрузка завершенного ремонта
- аналитический dashboard, использующий сохраненные financial snapshots
- историческая финансовая аналитика по выгруженным документам
- QuickFocus/VPR flow с полным inline-сценарием создания `Vehicle` и `Customer`
- admin user management с возможностью revoke/delete staff accounts
- dashboard service board calendar с operational view от текущего дня
- dashboard moneyflow с фиксированным rolling default range `today - 30 days` -> `today`
- staff vehicle-only access model с глобальной видимостью машин и скрытием customer PII
- moneyflow: сводные метрики по закупкам за период (перенос с UX **Purchases**)
- dashboard: подвкладка контроля закупок **No invoice** и **No vehicles**
- полный переход продукта и активной dev-документации на **английский** (см. §3 п.9)
- CMR: цена услуги, видимость `Service` в Django Admin, отказ от photo upload в полевом клиенте
- dashboard: связь MoneyFlow ↔ ServiceBoard по мастерам; вкладка расходников не в акте
- purchases: несколько товаров на инвойс; OCR скана инвойса; заказы поставщикам и реестр поставщиков в продуктовом UI

## 9) Deferred / Open Decisions
- ~~несколько PDF-версий на `Repair`~~: **да, версии монотонны; для просмотра по умолчанию — последняя (GET); новая версия только через POST export**; для dashboard агрегатов «по последнему акту» — **последняя версия по `version`** (см. `DOMAIN_RULES.md` §3.1)
- нужны ли ручные корректировки snapshot-данных после выгрузки
- как моделировать "прочие расходы": отдельная сущность, generic line items или расширение текущих сущностей
- это отдельный quick-create UX внутри repair flow или переиспользование существующих customer/vehicle modal-компонентов
- закрытие доступа staff: мягкая деактивация, физическое удаление аккаунта или оба режима
- что делать с клиентами, repair history и ownership-связями у удаленного/деактивированного staff
- какой временной масштаб нужен service board calendar: месяц, 2 недели, rolling window или переключаемые режимы
- как именно отображать ремонт на календаре: single-day markers, span lines, stacked lanes или гибрид
- должен ли moneyflow позволять вручную менять даты после открытия, если стартовый default всё равно всегда сбрасывается на `today - 30 days` -> `today`
- должен ли staff иметь полностью скрытую вкладку customers или read-only экран с анонимизированными связями вообще не нужен
- как сериализовать `Vehicle` для staff: отдельный serializer/view model или role-aware masking в текущем контракте
- хранилище фото: MinIO (self-hosted) vs S3-compatible cloud
- может ли один ремонт содержать несколько отдельных проблем
- нужен ли учет оплат клиента
- нужен ли склад запчастей
- нужны ли уведомления о ТО и ремонтах
- OCR: собственный сервис vs внешний API; допустимые форматы (PDF scan, фото); требования к хранению сырого файла
- расходники вне акта: отдельная сущность или флаг на закупке/строке; влияние на MoneyFlow и snapshot

## 10) Source Of Truth Map
- Strategy (active): `DEVELOPMENT_PLAN.md`
- Execution backlog (active): `NEXT_STEPS.md`
- Domain rules: `DOMAIN_RULES.md`
- Technical baseline: `TECH_STACK.md`
- E2E / Playwright framework (target): `docs/testing/playwright-e2e-framework.md`
- E2E patterns (ECC-derived, local): `.agents/e2e-testing/SKILL.md`
- Агенты и MCP (рекомендации): `docs/dev/agents-and-mcp.md`
- MCP профиль (JSON + установка в user config): `scripts/mcp/README.md`, `scripts/mcp/car-service-platform.default.json` (пустой, без дублей ECC), `scripts/mcp/car-service-platform.standalone.json`, `docs/dev/mcp-deduplication.md`, `scripts/mcp/install-user.mjs`
- Подготовка агентной сессии (любой провайдер): `docs/dev/agent-session-bootstrap.md`, `scripts/agents/bootstrap-agent-session.sh`
- History: `docs/planning/archive/`

## 11) Access Model

Роли пользователей: `admin`, `staff`.

| Role  | Navigation | Data Access |
|-------|-----------|-------------|
| admin | все вкладки: dashboard, customers, vehicles, repairs, purchases, users | все клиенты, все автомобили, все ремонты и документы |
| staff | только vehicles и repairs | все автомобили и их repair history, но без customer PII и contact details |

Правила:
- Staff не работает с customer records напрямую; создание, редактирование и просмотр customer identity остаются только у `admin`
- Admin создаёт клиента → `assigned_to = null` (виден всем admins)
- Staff видит весь список машин, их VIN/номер/модель, repair history и информацию по мастерам, но не видит имя клиента, телефон, email и другие контактные поля
- Staff не должен иметь доступ к customer endpoints и customer detail surface
- PDF-выгрузка доступна только для `completed` repairs и должна логировать автора/время создания snapshot

Создание пользователей:
- Admin приглашает нового пользователя → генерируется InviteToken (7 дней) → ссылка отображается в UI и отправляется на email → пользователь устанавливает пароль по ссылке `/invite/accept?token=...`.

UI-ограничения для staff:
- Vehicle detail: скрыты кнопки Edit Vehicle и Delete Vehicle
- Customer surface: недоступен целиком либо не содержит customer identity/contacts
- Repair detail: скрыта кнопка Delete Repair, поле Master отображается как текст (без возможности переназначения)
