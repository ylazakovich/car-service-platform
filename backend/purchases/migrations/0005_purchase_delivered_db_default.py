from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("purchases", "0004_purchase_delivered"),
    ]

    operations = [
        migrations.AlterField(
            model_name="purchase",
            name="delivered",
            field=models.BooleanField(db_default=False, default=False),
        ),
    ]
