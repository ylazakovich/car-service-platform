import django.utils.timezone
from django.db import migrations, models


def seed_default_template(apps, schema_editor):
    InvoiceLineParseTemplate = apps.get_model("purchases", "InvoiceLineParseTemplate")
    if InvoiceLineParseTemplate.objects.exists():
        return
    InvoiceLineParseTemplate.objects.create(
        name="Pipe table (demo PL)",
        description="Matches pipe-separated invoice lines like docs/samples/demo-invoice-plain.txt.",
        line_pattern=r"^\s*\d+\s*\|\s*(?P<part_name>.+?)\s*\|\s*(?P<quantity>\d+)\s*\|\s*\S+\s*\|\s*[\d\s.,]+\s*\|\s*(?P<purchase_price>[\d\s.,]+)",
        is_active=True,
        sort_order=0,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("purchases", "0008_supplier_registered_address"),
    ]

    operations = [
        migrations.CreateModel(
            name="InvoiceLineParseTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=128)),
                ("description", models.TextField(blank=True)),
                (
                    "line_pattern",
                    models.TextField(
                        help_text="Python regex with named groups part_name, quantity, purchase_price.",
                    ),
                ),
                ("is_active", models.BooleanField(db_default=True, default=True)),
                ("sort_order", models.PositiveSmallIntegerField(db_default=0, default=0)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "invoice_line_parse_templates",
                "ordering": ("sort_order", "id"),
            },
        ),
        migrations.RunPython(seed_default_template, migrations.RunPython.noop),
    ]
