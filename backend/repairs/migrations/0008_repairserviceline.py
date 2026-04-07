# Generated manually for repair service lines

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("repairs", "0007_repair_document_and_financial_snapshot"),
        ("services", "0002_service_price"),
    ]

    operations = [
        migrations.CreateModel(
            name="RepairServiceLine",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                (
                    "catalog_service",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="repair_line_usages",
                        to="services.service",
                    ),
                ),
                (
                    "repair",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="service_lines",
                        to="repairs.repair",
                    ),
                ),
            ],
            options={
                "db_table": "repair_service_lines",
                "ordering": ("repair_id", "sort_order", "id"),
            },
        ),
        migrations.RunPython(
            code=lambda apps, schema_editor: _backfill_lines(apps),
            reverse_code=migrations.RunPython.noop,
        ),
    ]


def _backfill_lines(apps):
    Repair = apps.get_model("repairs", "Repair")
    RepairServiceLine = apps.get_model("repairs", "RepairServiceLine")
    for repair in Repair.objects.all().iterator():
        if not RepairServiceLine.objects.filter(repair_id=repair.pk).exists():
            name = (repair.service_name or "").strip() or "—"
            RepairServiceLine.objects.create(repair_id=repair.pk, name=name, sort_order=0)
