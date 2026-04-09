# Generated manually for shop consumables + UoM catalog.

import django.utils.timezone
from django.db import migrations, models
import django.db.models.deletion


def seed_units_and_backfill_purchases(apps, schema_editor):
    UnitOfMeasure = apps.get_model("purchases", "UnitOfMeasure")
    Purchase = apps.get_model("purchases", "Purchase")

    defaults = [
        ("pcs", "Pieces", 10),
        ("L", "Liters", 20),
        ("kg", "Kilograms", 30),
        ("m", "Meters", 40),
        ("pair", "Pairs", 50),
        ("set", "Sets", 60),
    ]
    pcs = None
    for code, name, sort_order in defaults:
        u, _ = UnitOfMeasure.objects.get_or_create(
            code=code,
            defaults={"name": name, "is_active": True, "sort_order": sort_order},
        )
        if code == "pcs":
            pcs = u

    if pcs is None:
        pcs = UnitOfMeasure.objects.filter(code="pcs").first()

    if pcs:
        Purchase.objects.filter(unit_of_measure_id__isnull=True).update(unit_of_measure_id=pcs.id)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("purchases", "0005_purchase_delivered_db_default"),
    ]

    operations = [
        migrations.CreateModel(
            name="UnitOfMeasure",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.SlugField(max_length=32, unique=True)),
                ("name", models.CharField(max_length=64)),
                ("is_active", models.BooleanField(db_default=True, default=True)),
                ("sort_order", models.PositiveSmallIntegerField(db_default=0, default=0)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "units_of_measure",
                "ordering": ("sort_order", "code", "id"),
            },
        ),
        migrations.AddField(
            model_name="purchase",
            name="unit_of_measure",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="purchases",
                to="purchases.unitofmeasure",
            ),
        ),
        migrations.AddField(
            model_name="purchase",
            name="is_shop_consumable",
            field=models.BooleanField(
                db_default=False,
                default=False,
                help_text="Shop supplies not included on the completion act / PDF line items.",
            ),
        ),
        migrations.RunPython(seed_units_and_backfill_purchases, noop_reverse),
        migrations.AlterField(
            model_name="purchase",
            name="unit_of_measure",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="purchases",
                to="purchases.unitofmeasure",
            ),
        ),
    ]
