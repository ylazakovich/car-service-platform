from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("repairs", "0002_repair_completed_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="repair",
            name="mileage_at_service",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
