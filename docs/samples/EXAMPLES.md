# Каталог примеров документов (`docs/samples/`)

Все данные **вымышленные** (NIP, адреса, суммы — только для тестов и обучения).

## Быстрый выбор

| Задача | Файл |
|--------|------|
| Проверить импорт закупки (drop в модалке **New invoice**) с **текстовым слоем PDF** | `sample-invoice-pl-01-demo.pdf` |
| То же, но **без PDF** — только текст | `sample-invoice-pl-01-table-classic.txt` |
| Простой pipe-table на английских лейблах (короткий фрагмент) | `demo-invoice-plain.txt` |
| Получить свой PDF из визуального макета | `demo-invoice-example.html` → печать в PDF |
| Сложный разбор (блоки строк, не таблица) | `sample-invoice-pl-02-block-lines.txt` |
| Длинный текст / «две страницы» в одном `.txt` | `sample-invoice-pl-03-multipage-simulated.txt` |

## Полный список файлов

| Файл | Тип | Назначение |
|------|-----|------------|
| `sample-invoice-pl-01-demo.pdf` | PDF (текстовый слой) | Тот же сценарий, что у `sample-invoice-pl-01-table-classic.txt`: польская шапка `Sprzedawca: …`, таблица `Lp \| …`. Удобно проверить загрузку PDF без OCR. Пересборка: [`docs/spec/RUNBOOK.md`](../spec/RUNBOOK.md) — раздел *Regenerate demo invoice PDF*, или `scripts/demo/generate_demo_invoice_pdf.py`. |
| `sample-invoice-pl-01-table-classic.txt` | UTF-8 text | Классическая ASCII-таблица PL; шаблон **Pipe table (demo PL)** в Registers → Invoice lines. |
| `sample-invoice-pl-02-block-lines.txt` | UTF-8 text | Позиции блоками под шапкой — для проверки альтернативных regex. |
| `sample-invoice-pl-03-multipage-simulated.txt` | UTF-8 text | Две «страницы» в одном файле (разделитель `FF` и повтор номера фактуры). |
| `demo-invoice-plain.txt` | UTF-8 text | Компактный pipe-table; удобно вставлять в Preview / тесты. |
| `demo-invoice-example.html` | HTML | Макет фактуры в браузере; **Печать → Сохранить как PDF** для своего PDF. |
| `README.md` | Markdown | Краткое описание папки и пайплайна OCR. |

## Где в продукте смотреть разбор

- **Staff** → закупки → **New invoice** → зона **Drop invoice file here** (multipart suggest + линковка файла).
- **Admin / staff** → **Registers** → **Invoice lines** → шаблон **Pipe table (demo PL)** → Suggest / Preview на вставленном тексте.

## Синхронизация с кодом

Текст образца PL для PDF продублирован в `backend/purchases/invoice_parse/demo_invoice_pdf.py` (`DEMO_PL_TABLE_INVOICE_TEXT`). После правок `sample-invoice-pl-01-table-classic.txt` обновите константу и перегенерируйте PDF (см. RUNBOOK).
