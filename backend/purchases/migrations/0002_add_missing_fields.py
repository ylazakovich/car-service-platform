from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("purchases", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="supplier",
            name="nip",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="purchase",
            name="approximate_delivery_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
