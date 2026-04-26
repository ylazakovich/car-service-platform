# Generated manually for decimal purchase quantities.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("purchases", "0009_consumable_inventory_snapshot"),
    ]

    operations = [
        migrations.AlterField(
            model_name="purchase",
            name="quantity",
            field=models.DecimalField(db_default=1, decimal_places=2, default=1, max_digits=10),
        ),
    ]
