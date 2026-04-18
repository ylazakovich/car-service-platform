# Generated manually for consumable inventory tracking.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("purchases", "0006_unit_of_measure_and_shop_consumable"),
    ]

    operations = [
        migrations.AddField(
            model_name="purchase",
            name="current_stock_quantity",
            field=models.DecimalField(decimal_places=2, db_default=0, default=0, max_digits=10),
        ),
    ]
