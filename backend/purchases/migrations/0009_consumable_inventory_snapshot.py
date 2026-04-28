# Generated manually for nullable consumable inventory snapshots.

from django.db import migrations, models


def reset_legacy_shop_consumable_inventory(apps, schema_editor):
    Purchase = apps.get_model("purchases", "Purchase")
    Purchase.objects.filter(is_shop_consumable=True).update(
        current_stock_quantity=None,
        inventory_checked_on=None,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("purchases", "0008_supplier_registered_address"),
    ]

    operations = [
        migrations.AlterField(
            model_name="purchase",
            name="current_stock_quantity",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="purchase",
            name="inventory_checked_on",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.RunPython(
            reset_legacy_shop_consumable_inventory,
            migrations.RunPython.noop,
        ),
    ]
