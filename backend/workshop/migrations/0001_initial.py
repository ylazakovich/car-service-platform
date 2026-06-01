from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="WorkshopSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("phone", models.CharField(blank=True, max_length=50)),
                ("address", models.CharField(blank=True, max_length=300)),
                ("maps_url", models.URLField(blank=True)),
            ],
            options={"verbose_name": "Workshop settings", "verbose_name_plural": "Workshop settings"},
        ),
    ]
