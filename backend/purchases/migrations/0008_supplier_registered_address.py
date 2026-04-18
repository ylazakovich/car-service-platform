# Generated manually for supplier purchase order addresses.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("purchases", "0007_purchase_current_stock_quantity"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplier",
            name="registered_address",
            field=models.TextField(blank=True, default=""),
            preserve_default=False,
        ),
    ]
