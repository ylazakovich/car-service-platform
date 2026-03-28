from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("purchases", "0002_add_missing_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="purchase",
            name="invoice_url",
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
