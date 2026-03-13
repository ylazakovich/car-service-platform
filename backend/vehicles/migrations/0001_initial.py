from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("customers", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Vehicle",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("license_plate", models.CharField(max_length=20, unique=True)),
                ("make", models.CharField(max_length=120)),
                ("model", models.CharField(max_length=120)),
                ("year", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("vin", models.CharField(blank=True, max_length=64)),
                ("color", models.CharField(blank=True, max_length=64)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "customer",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="vehicles", to="customers.customer"),
                ),
            ],
            options={
                "db_table": "vehicles",
                "ordering": ("license_plate", "id"),
            },
        ),
    ]
