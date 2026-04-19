from django.db import migrations, models


def set_demo_supplier_pattern(apps, schema_editor):
    InvoiceLineParseTemplate = apps.get_model("purchases", "InvoiceLineParseTemplate")
    pat = r"(?is)Sprzedawca\s*\([^)]*\)\s*:\s*(?P<supplier_name>[^\r\n]+)"
    for row in InvoiceLineParseTemplate.objects.filter(name="Pipe table (demo PL)"):
        if not (row.supplier_pattern or "").strip():
            row.supplier_pattern = pat
            row.save(update_fields=["supplier_pattern"])


class Migration(migrations.Migration):
    dependencies = [
        ("purchases", "0009_invoice_line_parse_template"),
    ]

    operations = [
        migrations.AddField(
            model_name="invoicelineparsetemplate",
            name="supplier_pattern",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Optional regex on full document text; named group supplier_name captures vendor (e.g. Sprzedawca line).",
            ),
        ),
        migrations.RunPython(set_demo_supplier_pattern, migrations.RunPython.noop),
    ]
