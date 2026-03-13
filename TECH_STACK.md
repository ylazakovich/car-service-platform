# TECH_STACK

Технический baseline для `car-service-platform`.

- Last updated: `2026-03-13`
- Status: `approved baseline for project bootstrap`

## 1) Recommended Stack

### Backend
- `Python 3.12`
- `Django 5.2 LTS`
- `Django REST Framework`
- `django-cors-headers`
- `psycopg`
- `Gunicorn`

### Frontend
- `React 19`
- `TypeScript 5`
- `Vite 6`
- `React Router 7`
- `Axios`
- `Vitest` + `Testing Library`

### Database
- `PostgreSQL 17`

### Infrastructure
- `Docker Compose` для local/dev/prod bootstrap
- `Nginx` перед frontend
- S3-compatible object storage для фото и документов

### Deferred Infrastructure
Подключать только когда появится реальная потребность:
- `Redis` для background jobs, rate limiting, notifications, image processing
- `Celery` или `Django Q` для фоновых задач

## 2) Architecture Shape

Базовая схема:

1. `backend/`
- Django monolith
- REST API для staff UI и client portal
- Django Admin только для служебного управления

2. `frontend/`
- Один React application
- Внутри приложения отдельные маршруты и layouts для staff и client portal

3. `db/`
- PostgreSQL как единственный source of truth

4. `media/documents`
- object storage для фотографий и актов

## 3) Access Model

Не делать один универсальный UI для всех ролей.

Использовать 3 отдельных surface:

### A. Django Admin (`/admin/`)
Для:
- суперпользователя
- справочников
- ручных правок
- пользователей и ролей
- технических сущностей

Не использовать как основной рабочий интерфейс сотрудников.

### B. Staff App (`/app/*`)
Для сотрудников автосервиса:
- dashboard
- клиенты
- автомобили
- ремонты
- фото
- работы
- запчасти
- поставщики
- акты

### C. Client Portal (`/portal/*` или `/track/*`)
Для клиентов:
- просмотр статуса ремонта
- просмотр своей машины
- просмотр фото и итоговых документов
- доступ только к своим данным

## 4) Authentication Strategy

### Staff
- login/password
- session auth или JWT в HttpOnly cookies
- staff и admin не должны логиниться через client portal flow

### Clients
- доступ по уникальному коду или signed token
- код должен быть длинным и случайным, а не последовательным ID
- доступ должен быть ограничен scope конкретного клиента, автомобиля или ремонта

## 5) Why This Stack

- `Django` закрывает admin, ORM, auth, permissions и быстрый старт команды.
- `DRF` дает предсказуемый API для React UI.
- `React + Vite` уже знакомы по `f-cmr-template`, значит ниже стартовая стоимость.
- `PostgreSQL` достаточно надежен и прост для этой нагрузки.
- Для команды около 10 внутренних пользователей не нужна микросервисная архитектура.

## 6) What To Reuse From `f-cmr-template`

Можно переносить почти без изменений:
- `.github/` workflows и reusable actions
- базовый `Docker Compose` shape: `db + backend + frontend`
- Django project bootstrap
- health endpoint pattern
- logging setup
- env layout
- frontend bootstrap на `React + Vite + TypeScript`
- тестовый каркас `Vitest` и backend XML test reporting
- scripts для запуска, остановки, backup/restore после адаптации имен и переменных

Можно переносить частично:
- auth foundation
- CORS/cookie setup
- users/roles structure
- audit/logging conventions
- Docker healthchecks

Нельзя переносить как есть:
- invoice domain model
- invoice rules
- PDF/invoice logic
- Excel import flows
- любые специфичные сущности и API из invoice-проекта

## 7) Risks You Probably Did Not Plan Yet

### Photo Storage
- размеры файлов
- mobile upload UX
- EXIF/privacy cleanup
- retention rules

### Client Access Security
- защита кодов доступа
- срок жизни ссылки
- логирование просмотра
- запрет перебора кодов

### Audit Trail
- кто создал/изменил ремонт
- кто изменил статус
- кто сформировал акт

### Mobile Usage
- мастер, скорее всего, будет работать с телефона
- это влияет на формы, фото upload и layout staff app

### Documents
- нужно заранее решить, хранится ли акт как snapshot
- нужно ли PDF в M1 или только HTML/print view

## 8) Non-Goals For First Version

Не добавлять на старте:
- микросервисы
- GraphQL
- отдельный backend для client portal
- Elasticsearch
- event bus
- складскую систему
- сложный биллинг

## 9) Initial Technical Decisions To Confirm

- `session auth` vs `JWT in HttpOnly cookies` для staff
- `portal/<token>` vs `track/<code>` для client access
- `MinIO locally + S3 in prod` или сразу единый storage strategy
- нужен ли `Celery` уже в M1 для фото и документов, или можно отложить

## 10) Source Of Truth

- Product strategy: `DEVELOPMENT_PLAN.md`
- Execution backlog: `NEXT_STEPS.md`
- Domain rules: `DOMAIN_RULES.md`
- Technical baseline: `TECH_STACK.md`
