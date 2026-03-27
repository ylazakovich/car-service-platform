from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("vehicles", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="vehicle",
            name="mileage",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="vehicle",
            name="last_service_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="vehicle",
            name="added_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
