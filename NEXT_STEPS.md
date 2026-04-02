# NEXT_STEPS (Active)

Только актуальный backlog. Историю и закрытые большие блоки переносить в `docs/planning/archive/`.

- Last updated: `2026-04-02`
- Status: `m3 pdf export and historical analytics planning`

## NOW
- [ ] Добавить на страницу завершенного `Repair` кнопку `Выгрузить PDF` с явным ограничением: доступно только для статуса `completed`.
- [ ] Спроектировать и реализовать backend-модель(и) для versioned хранения `PDF`-документа и нормализованного `financial snapshot`, чтобы analytics не зависела только от текущего mutable-состояния ремонта.
- [ ] Зафиксировать состав snapshot-данных: работы, цены услуг, запчасти, цены продажи клиенту, закупочные цены, прочие расходы/позиции, итоговые суммы, версия и timestamp выгрузки.
- [ ] Привязать созданный PDF и snapshot к главному аналитическому dashboard, чтобы агрегаты считались по сохраненным значениям из выгрузки.
- [ ] Спроектировать сценарий исторического просмотра аналитики: как выбирать период, активную версию snapshot и как отображать архивные данные без пересчета задним числом.
- [ ] Согласовать source of truth для supplier/monthly analytics с новым snapshot-слоем, чтобы отчеты не расходились между собой.
- [ ] Подготовить тестовый контур для полного потока: `completed repair -> export PDF -> persist snapshot -> dashboard totals -> historical lookup`.
- [ ] Исправить `QuickFocus` / создание нового VPR: если нужный `Vehicle` не найден, дать inline-создание нового `Vehicle` прямо из repair flow.
- [ ] Добавить в тот же VPR flow inline-создание `Customer`, если для нового `Vehicle` не существует нужного клиента, с теми же полями и правилами, что на странице `Vehicle`.
- [ ] Переиспользовать или унифицировать customer/vehicle creation logic, чтобы QuickFocus flow не расходился с основным registry workflow по валидациям и данным.
- [ ] Добавить на admin users screen действие закрытия доступа для `staff`, чтобы бывшего сотрудника можно было убрать из системы.
- [ ] Определить и реализовать безопасную модель revocation: `delete`, `deactivate` или оба сценария, с учетом связанных `Customer.assigned_to`, repairs и audit trail.
- [ ] Добавить backend/API и UI-подтверждение для удаления или деактивации staff account с явной защитой от случайного удаления не того пользователя.
- [ ] Переработать `dashboard -> service_board` в большой календарный operational view, который стартует от текущего дня и показывает актуальную нагрузку сервиса.
- [ ] Спроектировать визуальный язык service board calendar: линии, маркеры или иные обозначения для `in_progress`, `waiting_parts`, `new`, `completed`, плюс читаемая легенда.
- [ ] Определить, по каким датам рисуется календарь для ремонта: дата создания, planned dates, completed date или derived operational span, чтобы представление было доменно корректным.
- [ ] Исправить `dashboard -> moneyflow` default dates: `EndDate = today`, `StartDate = today - 30 days` при каждом открытии экрана.
- [ ] Убрать зависимость initial moneyflow range от data bounds и зафиксировать rolling default, который не подменяется предыдущим пользовательским выбором при новом заходе.
- [ ] Добавить проверку timezone/date math для `moneyflow`, чтобы `today` и `-30 days` считались стабильно и без off-by-one ошибок.
- [ ] Изменить access model для `staff`: он должен видеть весь `Vehicles` registry и историю работ по машинам, а не только автомобили назначенных клиентов.
- [ ] Скрыть для `staff` customer PII на уровне API и UI: имя клиента, телефон, email и любые другие контактные данные не должны попадать в vehicle-centric workflow.
- [ ] Ограничить `staff` только vehicle-centric surface: работа с customer records и customer identity должна остаться исключительно у `admin`.

## NEXT
- [ ] Реализовать monthly history на snapshot-backed данных с фильтрами по клиенту, машине и периоду.
- [ ] Реализовать supplier reporting на тех же финансовых основаниях, что и PDF/dashboard.
- [ ] Довести completion act до финального документа и определить, это тот же PDF-поток или отдельный документный сценарий.
- [ ] Реализовать публичную страницу проверки статуса ремонта без client account.
- [ ] Подготовить карточку автомобиля с реальной историей ремонтов и документами по завершенным работам.
- [ ] Подготовить карточку клиента с реальной историей обращений и завершенных ремонтов.
- [ ] Добавить e2e-сценарий для документного и аналитического flow.
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

## Notes
- Этот файл намеренно короткий.
- Первый приоритет M3: PDF-выгрузка завершенного ремонта и сохранение аналитически значимого snapshot в БД.
- Второй приоритет M3: убрать блокер создания VPR, когда нужный `Vehicle` или `Customer` еще не заведены.
- Третий приоритет M3: дать админу управляемый способ закрывать доступ staff после увольнения.
- Четвертый приоритет M3: превратить service board в календарный operational dashboard с фокусом на текущий день.
- Пятый приоритет M3: зафиксировать moneyflow на стабильном дефолтном диапазоне `today - 30 days` -> `today`.
- Шестой приоритет M3: перевести staff на vehicle-only access model без доступа к customer PII.
