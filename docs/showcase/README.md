# Product showcase screenshots

> Human-facing gallery only. These screenshots are a visual tour of a demo run and are **not** a source of product requirements, agent workflow instructions, or test fixtures. AI agents should use `AGENTS.md` and `docs/spec/` for working context unless the user explicitly asks about this showcase.

Captured from the Docker dev stack after loading generated Datafaker demo data:

```bash
cp .env.example .env
bash scripts/compose/start.sh
DATAFAKER_DEMO_SEED=123 DATAFAKER_DEMO_PROFILE=demo DATAFAKER_DEMO_COUNT=10 bash scripts/db/load-datafaker-demo.sh
```

Default demo credentials from the runbook:

- Staff/admin: `admin@autoservice.local` / `admin12345`
- Django admin: `http://localhost:8000/admin/`
- Frontend: `http://localhost:4173`

## Staff authorization

![Staff login](screenshots/01-staff-login.png)

![Staff login with demo admin credentials](screenshots/02-staff-login-filled.png)

## Admin workspace tabs

### Dashboard

![Dashboard — MoneyFlow](screenshots/03-admin-dashboard-moneyflow.png)

![Dashboard — Warehouse](screenshots/04-dashboard-warehouse.png)

![Dashboard — Consumables](screenshots/04-dashboard-consumables.png)

![Dashboard — ServiceBoard](screenshots/04-dashboard-serviceboard.png)

### Vehicles

![Vehicles registry](screenshots/05-vehicles-registry.png)

![Vehicle form](screenshots/06-vehicle-form.png)

### Repairs

![Repairs Kanban](screenshots/07-repairs-kanban.png)

![New repair form](screenshots/08-repair-create-form.png)

![Repair detail form](screenshots/09-repair-detail-form.png)

### Purchases

![Purchases — Warehouse](screenshots/10-purchases-warehouse.png)

![Purchases — Consumables](screenshots/11-purchases-consumables.png)

![Purchases — Suppliers](screenshots/12-purchases-suppliers.png)

![Purchase line form](screenshots/13-purchase-form.png)

### Registers

![Registers — Units of measure](screenshots/14-registers-units.png)

![Unit form](screenshots/15-registers-unit-form.png)

![Registers — Services](screenshots/16-registers-services.png)

![Registers — Customers](screenshots/17-registers-customers.png)

### Users

![Users access management](screenshots/18-users-access.png)

![User invite form](screenshots/19-user-invite-form.png)

## Client order status

![Client repair status portal](screenshots/20-client-portal-status.png)

## Service Django admin

![Django admin login](screenshots/21-django-admin-login.png)

![Django admin operational control center](screenshots/22-django-admin-index.png)

![Django admin service list](screenshots/23-django-admin-service-list.png)

![Django admin service form](screenshots/24-django-admin-service-form.png)
