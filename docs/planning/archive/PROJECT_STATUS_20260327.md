# Project Status — Car Service Platform

_Last updated: 2026-03-27_

---

## 1. Что закрыто по общему плану

### Полностью готово

| Область | Что сделано |
|---|---|
| **Инфраструктура** | Docker Compose, gunicorn, nginx, health/version endpoints, request-ID middleware, JSON-логи в prod |
| **Auth** | Кастомная модель User (email + role), сессионная аутентификация, CSRF, login/logout/me |
| **UI-редизайн** | Dark theme + lemon accent (#cdd83a), единая дизайн-система через CSS-переменные |
| **Customers API** | Полный CRUD, role-scoping (staff видит только своих), поиск, 409 при удалении с машинами |
| **Vehicles API** | Полный CRUD, role-scoping, поиск, нормализация license plate |
| **Staff role separation** | Роли `admin`/`staff`, ограниченный sidebar для staff, `STAFF_ALLOWED_SECTIONS` |
| **Repairs Kanban (UI)** | Drag-and-drop, смена статусов, карточки с деталями — работает как UI |
| **Staff мобильный workflow** | Отдельные компоненты mobile list/detail для vehicles и repairs |
| **Admin модернизация** | Unfold admin, кастомный sidebar, dashboard callback, брендинг |
| **Admin: Services + Purchases** | Модели зарегистрированы в admin, навигация настроена |
| **Тесты backend** | Покрыты: auth flow, customers CRUD, vehicles CRUD, health/version, admin navigation |

### Не закрыто (стаб или пусто)

| Область | Статус |
|---|---|
| **Dashboard** | `renderDashboard()` возвращает `null` — пустой экран |
| **Client Portal** | Стаб — только показывает `accessCode`, никакого API-вызова |
| **Users management** | Стаб — хардкоженные "мастера", нет `/api/users/` endpoint |

---

## 2. Технический долг

### Высокий приоритет

**TD-01 · Repairs полностью in-memory**
- Нет бэкенд-модели, нет API, нет персистентности
- При перезагрузке страницы все ремонты теряются
- Фото (before/during/after) хранятся как `URL.createObjectURL` — живут только в текущей сессии
- Tracking codes генерируются на фронте (`TOR-${Date.now().slice(-4)}`) — возможны коллизии

**TD-02 · Purchases API отсутствует**
- Модели `Purchase` и `Supplier` есть, миграция есть, admin есть
- Нет ни одного REST endpoint (`/api/purchases/` не зарегистрирован)
- Фронт работает in-memory (3 hardcoded записи), форма не отправляет данные на сервер

**TD-03 · Services API отсутствует**
- Модель `Service` есть, но `/api/services/` отсутствует
- Фронт использует хардкоженные строки как preset-названия для ремонтов

**TD-04 · Поля Vehicle рассинхронизированы между фронтом и бэкендом**
- Frontend `VehicleFormState` собирает: `mileage`, `last_service_date`, `added_date`
- Backend модель `Vehicle` этих полей не имеет
- Данные молча сохраняются в `localStorage` (потеряются при чистке), на сервер не отправляются

**TD-05 · `StaffHomePage.tsx` — монолит 3100+ строк**
- Весь state, все handlers, все render-функции, все модальные окна в одном компоненте
- Нет custom hooks, нет context, нет разделения ответственности
- Уже разнесены `StaffVehiclesRegistry`, `StaffRepairsKanban` и мобильные компоненты, но `StaffHomePage` остался центром тяжести

---

### Средний приоритет

**TD-06 · `VehicleListCreateView` — нет `perform_create`**
- Staff-пользователь может создать Vehicle для любого Customer (не только своего)
- Нет проверки, что `customer` принадлежит `request.user`

**TD-07 · Demo-данные смешаны с реальными**
- `demoCustomersSeed` (3 записи, ID `-101..`) и `demoVehiclesSeed` (3 записи) всегда присутствуют в UI
- Пользователь не может их удалить — они пересоздаются при каждом рендере

**TD-08 · `CustomerDetailView` — queryset не скоупирован**
- `get_queryset()` возвращает всех customers (не только assigned_to)
- Проверка ownership только в `get_object()` — staff может зондировать существование чужих клиентов по ID

**TD-09 · `IsAdmin` permission class — мёртвый код**
- Определён в `users/permissions.py`, не импортирован нигде
- Все проверки inline: `request.user.role == "admin"`

**TD-10 · `CORS_ALLOWED_ORIGINS` по умолчанию — порт 4173 (preview), не 5173 (dev)**
- Во время `npm run dev` CORS и CSRF будут падать без явного `.env`

**TD-11 · Тесты не покрывают services и purchases**
- Нет ни одного test-файла для этих двух приложений

---

### Низкий приоритет

**TD-12 · `sectionOrder` не содержит `"customers"`**
- Если в localStorage сохранён раздел `"customers"` — откатывается на `"dashboard"` без предупреждения

**TD-13 · `seed_staff.py` — хардкоженные кредиты**
- `staff@autoservice.local / staff12345` всегда, без env-override (в отличие от `seed_admin.py`)

**TD-14 · `LoginPage` — default credentials в форме**
- `admin@autoservice.local / admin12345` prefill-ится в полях — нельзя оставлять в production

**TD-15 · Test-мок использует роль `"manager"`**
- Все smoke-тесты авторизуются с `role: "manager"` — ни `isAdmin`, ни `isStaff` не `true`
- Role-gating логика (`STAFF_ALLOWED_SECTIONS`, admin-only кнопки) не покрыта тестами

**TD-16 · `CustomerAdmin` — `assigned_to` не в `list_display`**
- В списке клиентов в admin невидно, кому из staff назначен клиент

**TD-17 · `PurchaseAdmin` — `invoice_url` не кликабельная ссылка**
- Отображается как plain text URLField, не как `<a href="...">`

**TD-18 · `Vehicle.delete` — тихое занулление в Purchases**
- `Purchase.vehicle` FK имеет `on_delete=SET_NULL`
- При удалении машины все её закупки молча получают `vehicle=null` — нет 409, нет предупреждения

---

## Итого

```
Закрыто по плану : ~65%
Не закрыто       : dashboard, client portal, users management
Критический долг : TD-01..TD-05 (repairs/purchases/services без персистентности, монолит, рассинхрон vehicle-полей)
```
