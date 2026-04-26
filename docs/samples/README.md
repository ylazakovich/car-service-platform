# Демо-материалы для инвойсов

Все данные **вымышленные** (не настоящие NIP, адреса, суммы). Назначение — локальные тесты, обучение пользователей и проверка разбора строк таблицы (regex / OCR-пайплайн).

**Каталог примеров документов** (что за файл и когда использовать): см. **[`EXAMPLES.md`](EXAMPLES.md)**.

## Файлы

| Файл | Назначение |
|------|------------|
| `sample-invoice-pl-01-demo.pdf` | **PDF с текстовым слоем** (тот же контент, что `sample-invoice-pl-01-table-classic.txt`): разбор и поставщик как у `.txt`, без OCR. Пересборка: `scripts/demo/generate_demo_invoice_pdf.py` (локально нужен `reportlab`) или команды в [`docs/spec/RUNBOOK.md`](../spec/RUNBOOK.md) («Regenerate demo invoice PDF»). |
| `demo-invoice-example.html` | Макет фактуры в браузере: таблица позиций, суммы, VAT. Откройте файл двойным щелчком или через «Open with browser», затем **Печать → Сохранить как PDF** для получения демо-PDF. |
| `demo-invoice-plain.txt` | Тот же инвойс в виде простого текста — удобно копировать в тесты парсера без HTML. |
| `sample-invoice-pl-01-table-classic.txt` | Синтетическая **PL-only** фактура: классическая ASCII-таблица (must-язык поставщика/лейблов — польский). |
| `sample-invoice-pl-02-block-lines.txt` | Синтетическая фактура: позиции **блоками** под шапкой (сложнее для построчного regex). |
| `sample-invoice-pl-03-multipage-simulated.txt` | Синтетическая фактура: **две «страницы»** в одном файле (разделитель формата FF + повтор nr faktury). |

В приложении (admin → **Registers** → вкладка **Invoice lines**) после миграций доступен шаблон **Pipe table (demo PL)** с regex под этот формат; там же лаборатория «Suggest / Preview» на встроенном фрагменте текста.

На бэкенде (Docker-образ и CI) установлены **Tesseract** (pol+eng) и **Poppler**: для загрузок в разборе инвойса выполняется OCR изображений и «пустых» относительно текстового слоя PDF (до 15 страниц). Для `sample-invoice-pl-01-demo.pdf` текст извлекается из **слоя PDF** (как у `.txt`), OCR не нужен — см. тест `test_suggest_multipart_pdf_text_layer_matches_plaintext_demo`.

Текст PL-образца продублирован в `backend/purchases/invoice_parse/demo_invoice_pdf.py` (`DEMO_PL_TABLE_INVOICE_TEXT`): при правке `.txt` синхронизируйте константу или перегенерируйте PDF.

## Использование

1. Откройте `demo-invoice-example.html` в Chrome / Edge / Firefox.
2. При необходимости сохраните как PDF через системный диалог печати.
3. Для автотестов или ручной отладки regex используйте `demo-invoice-plain.txt` как «сырой» текст после «OCR».
