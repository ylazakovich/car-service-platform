# Playwright E2E — целевой framework (car-service-platform)

- Last updated: 2026-04-05
- Статус: **целевой дизайн** (реализация поэтапно через `NEXT_STEPS.md`)
- Связанные артефакты: `frontend/playwright.config.ts`, `frontend/e2e/`, `backend/repairs/management/commands/seed_e2e_data.py`, `.github/workflows/pr.yml`, `DOMAIN_RULES.md`

## 1) Принцип: проход с первого раза, без ретраев

**Политика:** в CI `retries: 0` (и локально — то же самое для единообразия). Ретраи маскируют недетерминизм и ломают смысл регрессии «красный = баг или тест плохой».

Как достигается детерминизм:

1. **Явная готовность стека** до первого теста: не только HTTP 200 от статики фронта, но и успешный ответ **backend** (например `GET /api/health` через тот же origin, что и Playwright `baseURL`), плюс при необходимости проверка, что миграции и сиды отработали (см. §4).
2. **Фиксированные данные**: сиды с предсказуемыми ключами (`E2E-CI-001`, роли admin/staff) и **явное состояние** для сценариев PDF (наличие или отсутствие уже выгруженного PDF — отдельные фикстуры или отдельные команды сида, а не «как повезёт»).
3. **Ожидания через состояние UI/API**, а не фиксированные `sleep` (кроме редких исключений с комментарием и тикетом).
4. **Изоляция тестов**: тесты, которые мутируют данные (второй POST export), либо идут в хвосте сьюта, либо используют выделенного пользователя/ремонт/БД-слой (см. roadmap).

## 2) Слои framework

| Слой | Назначение | Расположение (целевое) |
|------|------------|-------------------------|
| **Конфиг** | проекты desktop/mobile, репортеры, trace/screenshot, `retries: 0` | `playwright.config.ts` |
| **Глобальная подготовка** | poll `GET /api/health` (тот же origin, что `baseURL`); пропуск: `E2E_SKIP_GLOBAL_SETUP=1` | `e2e/global-setup.ts` (+ `globalSetup` в `playwright.config.ts`) |
| **Фикстуры** | авторизация по роли, сохранение storageState | `e2e/fixtures/auth.ts` |
| **Page objects / экраны** | стабильные селекторы, переиспользование | `e2e/pages/*.ts` (эволюция из `helpers/`) |
| **Данные** | константы, синхрон с Python-сидом | `e2e/e2e-seed.ts` + `seed_e2e_data.py` |
| **Allure** | epic/feature/story | `e2e/allure-helpers.ts` |

## 3) Сценарная матрица (покрытие vs сейчас)

Сейчас: логин staff/admin, доска ремонтов, PDF view/export smoke, админ — перекладки вкладок dashboard.

Целевое покрытие (связка с `DEVELOPMENT_PLAN.md` §11 и M3):

- **Admin:** dashboard KPI (assert на ключевые числа/состояния после стабильных фикстур), MoneyFlow procurement summary, QuickFocus VPR, users revoke.
- **Staff:** полный vehicle registry без PII, repairs, PDF только completed.
- **Портал клиента** (token): отдельный лёгкий spec без staff-сессии.

Каждый epic в Allure уже завязан на `e2eBehaviors` — сохраняем и расширяем `story` по экранам из плана.

## 4) Сиды и состояние PDF

Проблема: `seed_e2e_data` идемпотентен по факту «есть любой completed repair», но **не гарантирует** наличие `RepairDocument` / версии PDF. Тесты «два View PDF без лишнего POST» зависят от начального состояния БД.

**Целевое решение (выбрать одно и зафиксировать в коде):**

- **Вариант A:** расширить `seed_e2e_data` (или добавить `seed_e2e_pdf_state`) — создавать ремонт с уже существующим документом для сценария «повторное открытие».
- **Вариант B:** два независимых сида / два license_plate: `E2E-CI-PDF-NEW` и `E2E-CI-PDF-EXISTING`.

## 5) CI: жёсткие ворота

**Сделано:**

1. Composite action `.github/actions/compose-up`: inputs `wait-for-api-health`, `api-health-url` (по умолчанию `http://127.0.0.1:4173/api/health`). После шага «Wait for frontend» идёт poll до JSON с `"status"` и успешного `curl`.
2. Job E2E в `.github/workflows/pr.yml`: `wait-for-api-health: true`.

**Дальше (по необходимости):** smoke с авторизацией, если появятся частые 502 от API после старта nginx.

Логи Docker при падении health-gate печатаются (`docker compose logs --tail=120`).

## 6) Версионирование и документация

Любое изменение сида Python → обновить комментарий/константы в `e2e-seed.ts`.

Новые экраны в M3 → добавить story в Allure и строку в этой таблице или в `NEXT_STEPS.md`.

## 7) Ссылки на внешние практики

Локальная копия skill **e2e-testing** (upstream ECC): `.agents/e2e-testing/SKILL.md` — [исходник в everything-claude-code](https://github.com/affaan-m/everything-claude-code/blob/main/.agents/skills/e2e-testing/SKILL.md). Сначала таблица **Car-service-platform overrides** в том файле; домен — `DOMAIN_RULES.md` и этот документ.
