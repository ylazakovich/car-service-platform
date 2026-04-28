import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("purchases", "0011_invoice_template_uom_named_group"),
    ]

    operations = [
        migrations.CreateModel(
            name="SupplierAlias",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("alias_text", models.CharField(help_text="Text as it appears on invoices (any casing).", max_length=255)),
                ("normalized_key", models.CharField(db_index=True, editable=False, max_length=255)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                (
                    "supplier",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="aliases",
                        to="purchases.supplier",
                    ),
                ),
            ],
            options={
                "db_table": "supplier_aliases",
                "ordering": ("supplier_id", "normalized_key", "id"),
            },
        ),
        migrations.AddConstraint(
            model_name="supplieralias",
            constraint=models.UniqueConstraint(fields=("normalized_key",), name="supplier_alias_normalized_key_unique"),
        ),
    ]
