from django.db import migrations

OLD_DEFAULT = r"(?is)Sprzedawca\s*\([^)]*\)\s*:\s*(?P<supplier_name>[^\r\n]+)"
COMBINED = r"(?is)(?:Sprzedawca\s*\([^)]*\)\s*:\s*|Sprzedawca\s*:\s*)(?P<supplier_name>[^\r\n]+)"


def forwards(apps, schema_editor):
    InvoiceLineParseTemplate = apps.get_model("purchases", "InvoiceLineParseTemplate")
    for row in InvoiceLineParseTemplate.objects.filter(name="Pipe table (demo PL)"):
        current = (row.supplier_pattern or "").strip()
        if current in ("", OLD_DEFAULT):
            row.supplier_pattern = COMBINED
            row.save(update_fields=["supplier_pattern"])


def backwards(apps, schema_editor):
    InvoiceLineParseTemplate = apps.get_model("purchases", "InvoiceLineParseTemplate")
    for row in InvoiceLineParseTemplate.objects.filter(name="Pipe table (demo PL)"):
        if (row.supplier_pattern or "").strip() == COMBINED:
            row.supplier_pattern = OLD_DEFAULT
            row.save(update_fields=["supplier_pattern"])


class Migration(migrations.Migration):
    dependencies = [
        ("purchases", "0012_supplier_alias"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
