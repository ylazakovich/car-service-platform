# NEXT_STEPS (Active)

Только актуальный backlog. Историю и закрытые большие блоки переносить в `docs/planning/archive/`.

- Last updated: `2026-04-10`
- Status: `M3 pdf/snapshot/dashboard — в работе; Registers (admin): функционал + E2E/CI есть, **UX не финализирован** — см. NOW → Registers UX; bulk-закупки и shop consumables (дашборд/акты); CMR / masters link / полноформатные инвойсы — в backlog`

## NOW

### Figma — дизайн-макет для шаринга с клиентами (активный трек)

Цель: собрать Desktop + Mobile Figma-макет на основе реального UI приложения, чтобы его можно было показать клиентам через Figma view-only link и отслеживать дизайн-решения централизованно.

**Инструмент:** локальный Figma MCP fork (`tools/figma-mcp/`) + канал `zmelolz5` (меняется при перезапуске плагина).

**Step 1 — Design System ✅ (2026-04-10)**
- [x] 20 компонентов с Auto Layout и corner radius
- [x] 15 color styles (Bg/*, Text/*, Primary, Danger, Warning, Success, Info)
- [x] 6 text styles (Heading/H1–H3, Body, Small, XS/Label)
- [x] 4 дополнительных компонента: Chip/Tracking, Chip/Date, Badge/Parts, Card/Registry

**Step 2 — Заменить raw Desktop фреймы на component instances (в работе)**
- [x] Nav items (9 шт: Active + Inactive)
- [x] Chips: Date chip, Status chips ×4 (New/InProgress/Done/Cancelled), Tracking chips ×20
- [x] Badges: Parts badge ×14
- [x] Cards: Registry ×2, Metric ×7, User/Worker ×2
- [x] Inputs: Default ×5, Compact ×6
- [x] Buttons: Primary ×3 (topbar CTAs), Primary/Small ×5 (sidebar, partial)
- [ ] Sidebar buttons — дорешить оставшиеся 7 пар (parent IDs: 5:309, 5:678, 5:967, 5:1074)
- [ ] UOM inline buttons ×13 (5:1006, 5:1029–5:1070 в теле 5:966)
- [ ] Vehicles screen buttons ×2 (5:1107 → Button/Primary/Small, 5:1113 → Button/Secondary)

**Step 3 — Собрать Mobile mockup (frame 5:6, 393px)**
- [ ] Bottom nav bar (Nav компоненты)
- [ ] Single-column layout: kanban cards, metric cards, registry cards
- [ ] Адаптировать sidebar → hamburger/drawer

**Step 4 — Применить color tokens к fills/strokes**
- [ ] Backgrounds → Color/Bg/* styles
- [ ] Text nodes → Color/Text/* styles

**Step 5 — Подготовить к шарингу**
- [ ] Открыть Figma view-only / comment-only ссылку для клиентов
- [ ] Проставить аннотации ключевых экранов (Figma Annotations)
- [ ] Сгруппировать экраны в Figma по flow: Dashboard → Kanban → Registry → UOM Admin

---

### E2E / Playwright / CI (активный трек качества)
- [x] Зафиксировать целевой дизайн framework: `docs/testing/playwright-e2e-framework.md`.
- [x] Политика **без ретраев** в `frontend/playwright.config.ts` (`retries: 0`).
- [x] Восстановить отсутствующий skill `.agents/e2e-validator/SKILL.md` (дрифт с `AGENTS.md`).
- [x] **CI:** перед `npx playwright test` опрашивать `GET /api/health` с того же origin, что `PLAYWRIGHT_BASE_URL` — `.github/actions/compose-up` (`wait-for-api-health`) + `pr.yml` E2E job.
- [x] **Playwright global setup:** `frontend/e2e/global-setup.ts` (poll `/api/health`, опциональный пропуск `E2E_SKIP_GLOBAL_SETUP=1`).
- [ ] **Сиды PDF:** явное начальное состояние для сценария «View PDF без лишнего POST» (два ремонта или расширение `demo/demo_data.sql` / отдельный SQL для E2E) — убрать зависимость от порядка прогонов.
- [ ] Расширить assert’ы dashboard E2E: не только headings, а ключевые KPI/тексты виджетов при фикстурных данных.
- [x] E2E **Registers** (admin): `frontend/e2e/staff-registers.spec.ts`, POM `StaffRegistersPage.ts` — вкладки Units / Services / Customers, поиск услуг, сиды в `e2e-seed.ts`.
- [x] Локальный **`vite preview`**: прокси `/api` и `/media` как у dev-сервера (`frontend/vite.config.ts` → `preview.proxy`) — стабильные запросы с `:4173`.
- [x] Задокументировать рекомендуемый набор MCP и выравнивание с ECC: `docs/dev/agents-and-mcp.md` (поддерживать при изменении практик команды).

### PDF + Financial Snapshot
- [x] Завершенный `Repair`: просмотр PDF и новая выгрузка только при `completed` (UI: **View PDF**; первая выгрузка при отсутствии файла; **Export new version** в превью). API: `GET …/pdf/` (последняя версия, без новой записи) и `POST …/pdf/export/` (новая версия).
- [x] Backend: `RepairDocument` + `RepairFinancialSnapshot`, versioned persist в media и БД; суммы из одного расчёта (`financial_totals`).
- [x] Состав snapshot: labor, parts client/purchase, other (0), document total, связь с документом и timestamp/author export.
- [x] Привязать созданный PDF и snapshot к главному аналитическому dashboard: `GET /api/analytics/dashboard/`, вкладки MoneyFlow (акты + сверка + график), Procurement (поставщики / unlinked / экспорты по пользователю), ServiceBoard (операционные KPI из API).
- [ ] Спроектировать сценарий исторического просмотра аналитики: как выбирать период, активную версию snapshot и как отображать архивные данные без пересчета задним числом.
- [ ] Согласовать source of truth для supplier/monthly analytics с новым snapshot-слоем, чтобы отчеты не расходились между собой.
- [ ] Полный контур: `… -> dashboard totals -> historical lookup` (частично: backend persist + Playwright `frontend/e2e/repair-pdf-view.spec.ts` для просмотра без лишнего POST export).
- [ ] **Хранение PDF актов (object storage):** спроектировать и доработать контур сохранения/выдачи актов завершения — вынести файлы `RepairDocument` с локального `MEDIA_ROOT`/volume в **S3-compatible** хранилище (AWS S3, MinIO, Cloudflare R2 и т.п.): загрузка при export, чтение для `GET …/pdf/`, опционально presigned URLs; миграция существующих файлов и политика бэкапа (bucket lifecycle / совместимость с `scripts/media-backup.sh` или отдельный snapshot бакета).

### QuickFocus / VPR Creation Flow
- [ ] Исправить `QuickFocus` / создание нового VPR: если нужный `Vehicle` не найден, дать inline-создание нового `Vehicle` прямо из repair flow.
- [ ] Добавить в тот же VPR flow inline-создание `Customer`, если для нового `Vehicle` не существует нужного клиента, с теми же полями и правилами, что на странице `Vehicle`.
- [ ] Переиспользовать или унифицировать customer/vehicle creation logic, чтобы QuickFocus flow не расходился с основным registry workflow по валидациям и данным.

### Admin User Management
- [ ] Добавить на admin users screen действие закрытия доступа для `staff`, чтобы бывшего сотрудника можно было убрать из системы.
- [ ] Определить и реализовать безопасную модель revocation: `delete`, `deactivate` или оба сценария, с учетом связанных `Customer.assigned_to`, repairs и audit trail.
- [ ] Добавить backend/API и UI-подтверждение для удаления или деактивации staff account с явной защитой от случайного удаления не того пользователя.

### Dashboard: Service Board Calendar
- [ ] Переработать `dashboard -> service_board` в большой календарный operational view, который стартует от текущего дня и показывает актуальную нагрузку сервиса.
- [ ] Спроектировать визуальный язык service board calendar: линии, маркеры или иные обозначения для `in_progress`, `waiting_parts`, `new`, `completed`, плюс читаемая легенда.
- [ ] Определить, по каким датам рисуется календарь для ремонта: дата создания, planned dates, completed date или derived operational span, чтобы представление было доменно корректным.

### Dashboard: MoneyFlow Default Range
- [x] При первом заходе на **Dashboard** выставлять moneyflow-диапазон: последние 30 дней → сегодня (local); при уходе со страницы и повторном входе — снова инициализация (ref), без привязки к data bounds.
- [ ] Явно зафиксировать в тестах e2e/unit сценарий «ушёл на другую вкладку → вернулся → снова rolling 30d» (smoke частично покрывает).
- [ ] Добавить проверку timezone/date math для `moneyflow`, чтобы `today` и `-30 days` считались стабильно и без off-by-one ошибок.

### Dashboard: MoneyFlow — сводка по закупкам
- [ ] Добавить на вкладку **MoneyFlow** блок метрик по закупкам за **тот же** выбранный период, что и остальной MoneyFlow: число учтённых строк закупок (и/или явная подпись «все в периоде» vs «загруженный slice»), сумма закупки (buy), сумма продажи клиенту (sale), маржа — аналог удалённого с **Purchases** блока Displayed / Buy / Sale / Margin.
- [ ] Реализовать расчёт на **backend** (endpoint или расширение `GET /api/analytics/dashboard/`) с фильтром по датам, согласованным с MoneyFlow; не привязывать итог к клиентской пагинации списка закупок.
- [ ] Зафиксировать в `DOMAIN_RULES.md` или короткой заметке к API: какие поля закупки входят в buy/sale/margin, статусы/черновики, влияет ли флаг **delivered** на сводку (если нет — явно «нет»).

### Dashboard: подвкладка No invoice / No vehicles
- [ ] Добавить в **Dashboard** отдельную подвкладку (рядом с MoneyFlow / Procurement / ServiceBoard) для операционного контроля: список или две секции закупок **без прикреплённого инвойса** и закупок **без привязанного автомобиля** (эквивалент бывших фильтров на **Purchases**).
- [ ] API: параметры фильтрации или отдельные лёгкие endpoints (с пагинацией), переиспользование сериализатора закупки; для **staff** — без customer PII в ответе.
- [ ] UI: счётчики, таблица/карточки, переход к существующей модалке/странице закупки; e2e smoke: открытие подвкладки и отображение данных при фикстурах.

### Staff Vehicle-Only Access
- [ ] Изменить access model для `staff`: он должен видеть весь `Vehicles` registry и историю работ по машинам, а не только автомобили назначенных клиентов.
- [ ] Скрыть для `staff` customer PII на уровне API и UI: имя клиента, телефон, email и любые другие контактные данные не должны попадать в vehicle-centric workflow.
- [ ] Ограничить `staff` только vehicle-centric surface: работа с customer records и customer identity должна остаться исключительно у `admin`.

### CMR / field app (`f-cmr-template` + backend)
- [ ] Контракт создания/обновления услуги из CMR: **всегда передавать цену**; валидация и маппинг в `Service.price` (или явная line-item модель, если уйдём от плоского Service).
- [ ] Исправить рассинхрон: услуги, созданные через CMR, **появляются в Django Admin** (`/admin/`) в том же реестре `Service`, что и остальные (проверить API, права, отдельные таблицы/черновики, кэш).
- [ ] Убрать **загрузку фотографий** из сценариев CMR (UI + любые вызовы `uploads`/media из полевого клиента).

### Registers & reference data (admin) — **функционал + тесты; UX — в backlog**
- [x] Секция **Registers**: вкладки **Units of measure** (CRUD, reorder, поиск), **Services** (инлайн-редактирование, поиск, переключатель Active/Inactive), **Customers with vehicles** (таблица + модалка правки контактов).
- [x] Справочник **`UnitOfMeasure`**, связь с строками закупки; API `/api/purchases/units/` и флаг **`is_shop_consumable`** на закупке.
- [x] Отображение телефонов в формате витрины **`+48 …`** (`formatPolishPhone`) на staff vehicle/customer surfaces где применимо.
- [x] E2E Registers (desktop + mobile), стабильные локаторы без хрупких API раннера.

**Registers — что сделать по UX (следующий проход):**
- [ ] **Пустые и краевые состояния:** нет UoM / нет услуг / нет клиентов — понятный текст, CTA (куда идти), без «немой» таблицы.
- [ ] **Ошибки и сохранение:** инлайн-редактирование Services и формы Customers — явные сообщения при 4xx/5xx, откат или блок повторной отправки, индикатор сохранения.
- [ ] **Согласованность UI:** таблицы, отступы, кнопки и модалки в одном стиле с **Purchases / Vehicles / Repairs** (плотность строк, заголовки, мобильные брейкпоинты).
- [ ] **Узкая ширина (mobile / drawer):** табы Registers, горизонтальный скролл таблиц, не обрезать первичные действия (**+ Add service**, поиск, reorder handles).
- [ ] **Деструктивные действия:** удаление единицы измерения, деактивация услуги, опасные правки — подтверждение и последствия в копирайте (связь с закупками / строками).
- [ ] **Доступность и клавиатура:** фокус при открытии модалки, порядок таба в инлайн-полях каталога услуг, `aria` для табов и поиска (в рамках существующих паттернов приложения).
- [ ] **EN-only поверхность:** пройти строки Registers и связанных модалок — убрать остатки RU, выровнять термины с `DOMAIN_RULES.md` / остальным staff UI.
- [ ] **Подсказки контекста:** короткие подписи/tooltip где нужно (зачем UoM в закупках, что значит Active/Inactive для услуги в каталоге vs в ремонте).

### Dashboard: мастера и расходники
- [ ] **Связать вкладку MoneyFlow (1) и ServiceBoard (3)** в части мастеров: общий фильтр/дреллдаун по мастеру, deep-link или синхронизация query state — спецификация UX и границы данных (snapshot vs live).
- [x] **Расходники вне акта (baseline):** флаг `is_shop_consumable`, исключение строк из completion PDF / `RepairFinancialSnapshot`, блок **`shop_consumables`** в MoneyFlow API, вкладка **Dashboard → Consumables** и **Purchases → Consumables** — см. `DOMAIN_RULES.md`. Остаётся полировка UX и любые расширения модели по мере необходимости.

### Purchases, инвойсы, поставщики
- [x] **Несколько строк в одном запросе:** `POST /api/purchases/bulk/` (общие поля заказа + массив `lines`) — без отдельной сущности «invoice header» в БД; UI закупок использует bulk-текущий контур.
- [ ] **Полноценный инвойс header + lines** как доменная сущность (если понадобится отчётность/версии), миграция с плоских `Purchase` при необходимости.
- [ ] **OCR / разбор скана инвойса:** извлечение позиций (товар, цена, количество при наличии), поставщик, референсы; черновик + подтверждение пользователем перед сохранением (выбор движка: локально / внешний API — решение в ADR или open decisions).
- [ ] Экран **Purchases**: **создание заказа поставщику** (purchase order / supplier order flow) и явное **ведение базы поставщиков** (CRUD, поиск, привязка к заказам и к строкам закупки; расширить текущий `Supplier` + UX).

## NEXT
- [ ] Реализовать monthly history на snapshot-backed данных с фильтрами по клиенту, машине и периоду.
- [ ] Реализовать supplier reporting на тех же финансовых основаниях, что и PDF/dashboard.
- [ ] Довести completion act до финального документа и определить, это тот же PDF-поток или отдельный документный сценарий.
- [ ] Подготовить карточку автомобиля с реальной историей ремонтов и документами по завершенным работам.
- [ ] Подготовить карточку клиента с реальной историей обращений и завершенных ремонтов.
- [x] Добавить e2e-сценарий для **дашборда** (минимум: `frontend/e2e/admin-dashboard-visit.spec.ts` — вход admin, вкладки MoneyFlow / Procurement / ServiceBoard / Consumables).
- [x] E2E **Registers**: `frontend/e2e/staff-registers.spec.ts` (admin, desktop + mobile).
- [ ] Расширить e2e: проверка загрузки `/analytics/dashboard/` и ключевых KPI (после стабильных фикстур).
- [ ] E2E дашборда: сводка закупок на **MoneyFlow** (buy/sale/margin slice) + подвкладка **No invoice / No vehicles** (открытие, базовые данные при фикстурах); блок **shop consumables** уже есть в API/UI — при необходимости отдельный assert.
- [ ] Добавить e2e-сценарий для QuickFocus/VPR flow: `поиск vehicle -> create vehicle -> create customer if needed -> create repair`.
- [ ] Добавить тесты и e2e-сценарий для admin user revocation flow.
- [ ] Добавить тесты и e2e-сценарии для service board calendar: текущий день, waiting parts, легенда, переключение периода.
- [ ] Добавить тесты для moneyflow default range: первый рендер, повторный заход, корректные `today` и `today - 30 days`.
- [ ] Добавить tests/e2e для нового staff access model: staff видит все машины, но не получает customer identity и contacts.

## LATER
- [ ] Выбрать и реализовать постоянное хранилище фото ремонта (`MinIO` или `S3-compatible`).
- [ ] Добавить observability, auditing и операционные runbooks для документного и аналитического контура.
- [ ] Детализировать оплаты, скидки, налоги, inventory и уведомления, если они войдут в roadmap.
- [ ] Рассмотреть backfill для старых completed repairs, если исторические PDF/snapshot нужны задним числом.
- [ ] **CodeQL taint chain fix**: убрать временный `exclude js/xss-through-dom` из `.github/codeql/codeql-config.yml` — заменить прямое использование API URL в `img.src` на `fetch → response.blob() → URL.createObjectURL()`, чтобы сломать taint chain без конфигурационного workaround. Текущая защита через `sanitizeImageUrl` функционально правильная, но CodeQL не распознаёт её как sanitizer.

## Notes
- Этот файл намеренно короткий.
- **PR `feature/m3-pdf-snapshot-persist`:** закрывает первый вертикальный срез M3 (persist + snapshot + разделение просмотра/новой выгрузки). Дашборд и историческая аналитика — следующий шаг (может быть отдельная ветка).
- Первый приоритет M3: PDF + snapshot — **выполнен**; интеграция с dashboard (read-only аналитика) — **выполнена** в текущей ветке.
- Второй приоритет M3: убрать блокер создания VPR, когда нужный `Vehicle` или `Customer` еще не заведены.
- Третий приоритет M3: дать админу управляемый способ закрывать доступ staff после увольнения.
- Четвертый приоритет M3: превратить service board в календарный operational dashboard с фокусом на текущий день.
- Пятый приоритет M3: зафиксировать moneyflow на стабильном дефолтном диапазоне `today - 30 days` -> `today`.
- Шестой приоритет M3: перевести staff на vehicle-only access model без доступа к customer PII.
- Сводка закупок на **MoneyFlow** и подвкладка **No invoice / No vehicles** в **Dashboard** — закрывают UX-разрыв после упрощения экрана **Purchases** (метрики и фильтры переносятся в аналитический/операционный контур дашборда).
- **Продуктовый ввод 2026-04-09:** CMR (цена услуги, admin parity, без фото), дашборд (мастера между вкладками), закупки (OCR, PO, реестр поставщиков, опционально отдельный invoice-header) — детализация в NOW и в `DEVELOPMENT_PLAN.md` §3 п.10–12.
- **Срез 2026-04-10 (реестры + закупки):** Registers (admin) — **функционал и E2E**; UX-полировка вынесена в NOW → **Registers — что сделать по UX**; `UnitOfMeasure`, bulk `POST /purchases/bulk/`, `is_shop_consumable` + исключение из акта + Consumables в dashboard/purchases, `vite preview` proxy.

## Completed (M3 partial)
- [x] PDF export кнопка на `completed` repair + preview modal (`PdfPreviewModal`, `pdf_generator.py`) — `2026-04-02`
- [x] Client portal с secure random token — `/portal/{token}` страница, API endpoint, status stepper — `2026-04-02`
- [x] Estimated completion date поле на repair — `2026-04-02`
- [x] Portal token regen (admin-only) + copy link — `2026-04-02`
- [x] Login page client mode toggle (3D card flip) — `2026-04-02`
- [x] Repair card UX: i18n fixes, done-column management — `2026-04-02`
- [x] Scroll fix on repairs kanban + vehicle repair history tab — `2026-04-02`
- [x] XSS fix: `sanitizeImageUrl` + CodeQL suppression для `img.src` с API URL — `2026-04-02`
