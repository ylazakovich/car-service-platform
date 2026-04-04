from decimal import Decimal

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models

import repairs.models


class Migration(migrations.Migration):

    dependencies = [
        ("repairs", "0006_add_estimated_date"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="RepairDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("version", models.PositiveIntegerField()),
                ("file", models.FileField(upload_to=repairs.models.repair_pdf_upload_to)),
                ("original_filename", models.CharField(max_length=255)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                (
                    "exported_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="exported_repair_documents",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "repair",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="documents",
                        to="repairs.repair",
                    ),
                ),
            ],
            options={
                "db_table": "repair_documents",
                "ordering": ("repair_id", "version"),
            },
        ),
        migrations.CreateModel(
            name="RepairFinancialSnapshot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("labor_total", models.DecimalField(decimal_places=2, max_digits=12)),
                ("parts_client_total", models.DecimalField(decimal_places=2, max_digits=12)),
                ("parts_purchase_total", models.DecimalField(decimal_places=2, max_digits=12)),
                ("other_expenses_total", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=12)),
                ("document_total", models.DecimalField(decimal_places=2, max_digits=12)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                (
                    "document",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="financial_snapshot",
                        to="repairs.repairdocument",
                    ),
                ),
                (
                    "repair",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="financial_snapshots",
                        to="repairs.repair",
                    ),
                ),
            ],
            options={
                "db_table": "repair_financial_snapshots",
                "ordering": ("repair_id", "document__version"),
            },
        ),
        migrations.AddConstraint(
            model_name="repairdocument",
            constraint=models.UniqueConstraint(fields=("repair", "version"), name="uniq_repair_document_version"),
        ),
    ]
