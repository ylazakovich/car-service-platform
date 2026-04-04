from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("purchases", "0003_alter_purchase_invoice_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="purchase",
            name="delivered",
            field=models.BooleanField(default=False),
        ),
    ]
