# Playwright E2E — целевой framework (car-service-platform)

- Last updated: 2026-04-10
- Статус: **целевой дизайн** (реализация поэтапно через `docs/spec/TASKS.md`, секция E2E)
- Связанные артефакты: `frontend/playwright.config.ts`, `frontend/e2e/`, `scripts/demo/demo_data.sql`, `.github/workflows/pr.yml` (шаг загрузки демо перед Playwright), `docs/spec/DOMAIN_RULES.md`, [test-pyramid.md](./test-pyramid.md) (вершина пирамиды — UI/E2E)

## 1) Принцип: проход с первого раза, без ретраев

**Политика:** в CI `retries: 0` (и локально — то же самое для единообразия). Ретраи маскируют недетерминизм и ломают смысл регрессии «красный = баг или тест плохой».

Как достигается детерминизм:

1. **Явная готовность стека** до первого теста: не только HTTP 200 от статики фронта, но и успешный ответ **backend** (например `GET /api/health` через тот же origin, что и Playwright `baseURL`), плюс при необходимости проверка, что миграции и сиды отработали (см. §4).
2. **Фиксированные данные**: в CI после `compose-up` в БД грузится `scripts/demo/demo_data.sql`; стабильная опора для staff-сценариев — ремонт **TOR-1001** (константы в `e2e/e2e-seed.ts`). Роли admin/staff — `seed_admin` / `seed_staff`. Для PDF по-прежнему нужно **явное состояние** (наличие/отсутствие уже выгруженного PDF) — см. §4.
3. **Ожидания через состояние UI/API**, а не фиксированные `sleep` (кроме редких исключений с комментарием и тикетом).
4. **Изоляция тестов**: тесты, которые мутируют данные (второй POST export), либо идут в хвосте сьюта, либо используют выделенного пользователя/ремонт/БД-слой (см. roadmap).

## 2) Слои framework

| Слой | Назначение | Расположение (целевое) |
|------|------------|-------------------------|
| **Конфиг** | проекты desktop/mobile, репортеры, trace/screenshot, `retries: 0` | `playwright.config.ts` |
| **Глобальная подготовка** | poll `GET /api/health` (тот же origin, что `baseURL`); пропуск: `E2E_SKIP_GLOBAL_SETUP=1` | `e2e/global-setup.ts` (+ `globalSetup` в `playwright.config.ts`) |
| **Фикстуры** | авторизация по роли, сохранение storageState | `e2e/fixtures/auth.ts` |
| **Page objects / экраны** | стабильные селекторы, переиспользование | `e2e/pages/*.ts` (эволюция из `helpers/`) |
| **Данные** | константы, синхрон с `scripts/demo/demo_data.sql` | `e2e/e2e-seed.ts` (TOR-1001, услуга для ремонта, константы Registers) |
| **Allure** | epic/feature/story | `e2e/allure-helpers.ts` |

## 3) Сценарная матрица (покрытие vs сейчас)

Сейчас: логин staff/admin, доска ремонтов, PDF view/export smoke, админ — вкладки dashboard (включая Consumables), **Registers** (`staff-registers.spec.ts`: Units / Services / Customers), **создание карточки ремонта** (`staff-repair-intake-create.spec.ts`: intake **+ New Repair** / **New Repair** → карточка в колонке New, сценарии `@desktop` и `@mobile-only`).

Целевое покрытие (связка с `docs/spec/PRODUCT.md` и M3):

- **Admin:** dashboard KPI (assert на ключевые числа/состояния после стабильных фикстур), MoneyFlow procurement summary (buy/sale/margin + No invoice / No vehicles), QuickFocus VPR, users revoke.
- **Staff:** полный vehicle registry без PII, repairs, PDF только completed.
- **Портал клиента** (token): отдельный лёгкий spec без staff-сессии.

Каждый epic в Allure уже завязан на `e2eBehaviors` — сохраняем и расширяем `story` по экранам из плана.

## 4) Сиды и состояние PDF

Решение для детерминизма PDF E2E:

- `scripts/demo/demo_data.sql` оставляет `TOR-1001` как completed repair **без** `RepairDocument`; сценарии Make Act / first export продолжают проверять создание первого документа.
- После загрузки SQL CI и `scripts/db/load-demo.sh` запускают `python manage.py seed_e2e_pdf_documents`, который создаёт реальный `RepairDocument` + `RepairFinancialSnapshot` + PDF-файл для `TOR-2001`.
- `frontend/e2e/e2e-seed.ts` разделяет эти фикстуры: `E2E_DEMO_REPAIR_TRACKING_CODE` для no-PDF flow и `E2E_DEMO_REPAIR_WITH_PDF_TRACKING_CODE` для “View PDF without extra POST”.
- E2E не должен полагаться на POST `/pdf/export/` как неявную подготовку к тесту “View PDF”: наличие PDF задаёт management command seed-fragment.

## 5) CI: жёсткие ворота

**Сделано:**

1. Composite action `.github/actions/compose-up`: inputs `wait-for-api-health`, `api-health-url` (по умолчанию `http://127.0.0.1:4173/api/health`). После шага «Wait for frontend» идёт poll до JSON с `"status"` и успешного `curl`.
2. Job E2E в `.github/workflows/pr.yml`: `wait-for-api-health: true`, затем шаг **Load demo data for E2E** (`psql` + `scripts/demo/demo_data.sql`).

**Дальше (по необходимости):** smoke с авторизацией, если появятся частые 502 от API после старта nginx.

Логи Docker при падении health-gate печатаются (`docker compose logs --tail=120`).

## 6) Версионирование и документация

Любое изменение фикстурного ремонта в `scripts/demo/demo_data.sql` (TOR-1001 / услуга) → обновить `e2e-seed.ts` и при необходимости POM.

Новые экраны в M3 → добавить story в Allure и строку в этой таблице или задачу в `docs/spec/TASKS.md`.

## 7) Ссылки на внешние практики

Локальная копия skill **e2e-testing** (upstream ECC): `.agents/e2e-testing/SKILL.md` — [исходник в everything-claude-code](https://github.com/affaan-m/everything-claude-code/blob/main/.agents/skills/e2e-testing/SKILL.md). Сначала таблица **Car-service-platform overrides** в том файле; домен — `docs/spec/DOMAIN_RULES.md` и этот документ.
