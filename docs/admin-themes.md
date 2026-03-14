# Готовые темы для Django Admin

Если не хочется вести кастомные стили под основной проект, можно поставить проверенную готовую тему — они дают единый вид, нормальную типографику и часто дашборд из коробки.

## Варианты

### 1. **Django Unfold** (современный, Tailwind)
- Сайт: https://unfoldadmin.com/
- Репозиторий: https://github.com/unfoldadmin/django-unfold
- Дашборд, сайдбар с иконками, палитры, фильтры, опционально command palette. Подходит, если нужен «нормальный» админ без привязки к стилю основного приложения.

**Установка:**
```bash
pip install django-unfold
```

В `settings.py`: добавить `"unfold"` в `INSTALLED_APPS` **перед** `"django.contrib.admin"`.  
В `urls.py`: заменить `admin.site.urls` на `path("admin/", include("unfold.urls"))` (см. [документацию](https://unfoldadmin.com/docs)).

---

### 2. **Django Jazzmin** (Bootstrap / AdminLTE)
- Документация: https://django-jazzmin.readthedocs.io/
- Репозиторий: https://github.com/jazzband/django-jazzmin
- Классический вид на Bootstrap 4 / AdminLTE 3, много настроек в `JAZZMIN_SETTINGS`, сайдбар, модалки вместо попапов.

**Установка:**
```bash
pip install django-jazzmin
```

В `settings.py`: добавить `"jazzmin"` в `INSTALLED_APPS` **перед** `"django.contrib.admin"`.  
Тему (светлая/тёмная), логотип и меню настраивают через `JAZZMIN_SETTINGS` (см. [документацию](https://django-jazzmin.readthedocs.io/)).

---

### 3. **Grappelli** (классика)
- Сайт: https://grappelliproject.com/
- Старая, стабильная тема поверх стандартного админского HTML. Меньше «магии», проще встраивать в свой проект.

---

## Что сделать при переходе на готовую тему

1. Установить пакет и прописать его в `INSTALLED_APPS` перед `django.contrib.admin`.
2. Убрать или отключить свои переопределения админки:
   - `backend/templates/admin/base_site.html` — можно оставить только смену `site_title` / `site_header` при необходимости; остальное даёт тема.
   - `backend/templates/admin/index.html` — при использовании Unfold/Jazzmin обычно не нужен, у них свой дашборд.
   - `backend/foundation/static/admin/custom/admin.css` — не подключать или удалить, чтобы не конфликтовать с темой.
3. Настроить `FRONTEND_URL` / «View site» как уже сделано в `config/urls.py` — это не зависит от темы.

Текущая кастомизация (под стиль основного приложения) остаётся в силе, пока не переключишься на одну из тем выше.
