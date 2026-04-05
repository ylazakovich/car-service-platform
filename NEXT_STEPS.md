# NEXT_STEPS (Active)

Только актуальный backlog. Историю и закрытые большие блоки переносить в `docs/planning/archive/`.

- Last updated: `2026-04-05`
- Status: `m3 продуктовый контур pdf/snapshot/dashboard в работе; усиление E2E+CI (без ретраев) вынесено в активный трек — см. docs/testing/playwright-e2e-framework.md и NOW ниже`

## NOW

### E2E / Playwright / CI (активный трек качества)
- [x] Зафиксировать целевой дизайн framework: `docs/testing/playwright-e2e-framework.md`.
- [x] Политика **без ретраев** в `frontend/playwright.config.ts` (`retries: 0`).
- [x] Восстановить отсутствующий skill `.agents/e2e-validator/SKILL.md` (дрифт с `AGENTS.md`).
- [ ] **CI:** перед `npx playwright test` опрашивать `GET /api/health` с того же origin, что `PLAYWRIGHT_BASE_URL` (расширить `.github/actions/compose-up` или отдельный step в `pr.yml`).
- [ ] **Playwright global setup:** единая точка ожидания готовности API (и при необходимости — повторяемая проверка после старта контейнеров).
- [ ] **Сиды PDF:** явное начальное состояние для сценария «View PDF без лишнего POST» (два ремонта или расширение `seed_e2e_data` / отдельная команда) — убрать зависимость от порядка прогонов.
- [ ] Расширить assert’ы dashboard E2E: не только headings, а ключевые KPI/тексты виджетов при фикстурных данных.
- [x] Задокументировать рекомендуемый набор MCP и выравнивание с ECC: `docs/dev/agents-and-mcp.md` (поддерживать при изменении практик команды).

### PDF + Financial Snapshot
- [x] Завершенный `Repair`: просмотр PDF и новая выгрузка только при `completed` (UI: **View PDF**; первая выгрузка при отсутствии файла; **Export new version** в превью). API: `GET …/pdf/` (последняя версия, без новой записи) и `POST …/pdf/export/` (новая версия).
- [x] Backend: `RepairDocument` + `RepairFinancialSnapshot`, versioned persist в media и БД; суммы из одного расчёта (`financial_totals`).
- [x] Состав snapshot: labor, parts client/purchase, other (0), document total, связь с документом и timestamp/author export.
- [x] Привязать созданный PDF и snapshot к главному аналитическому dashboard: `GET /api/analytics/dashboard/`, вкладки MoneyFlow (акты + сверка + график), Procurement (поставщики / unlinked / экспорты по пользователю), ServiceBoard (операционные KPI из API).
- [ ] Спроектировать сценарий исторического просмотра аналитики: как выбирать период, активную версию snapshot и как отображать архивные данные без пересчета задним числом.
- [ ] Согласовать source of truth для supplier/monthly analytics с новым snapshot-слоем, чтобы отчеты не расходились между собой.
- [ ] Полный контур: `… -> dashboard totals -> historical lookup` (частично: backend persist + Playwright `frontend/e2e/repair-pdf-view.spec.ts` для просмотра без лишнего POST export).

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

## NEXT
- [ ] Реализовать monthly history на snapshot-backed данных с фильтрами по клиенту, машине и периоду.
- [ ] Реализовать supplier reporting на тех же финансовых основаниях, что и PDF/dashboard.
- [ ] Довести completion act до финального документа и определить, это тот же PDF-поток или отдельный документный сценарий.
- [ ] Подготовить карточку автомобиля с реальной историей ремонтов и документами по завершенным работам.
- [ ] Подготовить карточку клиента с реальной историей обращений и завершенных ремонтов.
- [x] Добавить e2e-сценарий для **дашборда** (минимум: `frontend/e2e/admin-dashboard-visit.spec.ts` — вход admin, вкладки MoneyFlow / Procurement / ServiceBoard).
- [ ] Расширить e2e: проверка загрузки `/analytics/dashboard/` и ключевых KPI (после стабильных фикстур).
- [ ] E2E дашборда: блок сводки закупок на **MoneyFlow** + подвкладка **No invoice / No vehicles** (открытие, базовые данные при фикстурах).
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

## Completed (M3 partial)
- [x] PDF export кнопка на `completed` repair + preview modal (`PdfPreviewModal`, `pdf_generator.py`) — `2026-04-02`
- [x] Client portal с secure random token — `/portal/{token}` страница, API endpoint, status stepper — `2026-04-02`
- [x] Estimated completion date поле на repair — `2026-04-02`
- [x] Portal token regen (admin-only) + copy link — `2026-04-02`
- [x] Login page client mode toggle (3D card flip) — `2026-04-02`
- [x] Repair card UX: i18n fixes, done-column management — `2026-04-02`
- [x] Scroll fix on repairs kanban + vehicle repair history tab — `2026-04-02`
- [x] XSS fix: `sanitizeImageUrl` + CodeQL suppression для `img.src` с API URL — `2026-04-02`
