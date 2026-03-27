from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("vehicles", "0002_add_vehicle_extra_fields"),
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Repair",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("service_name", models.CharField(max_length=255)),
                ("issue_notes", models.TextField(blank=True)),
                ("status", models.CharField(
                    choices=[
                        ("new", "New"),
                        ("in_progress", "In Progress"),
                        ("waiting_parts", "Waiting for Parts"),
                        ("completed", "Completed"),
                    ],
                    default="new",
                    max_length=20,
                )),
                ("tracking_code", models.CharField(blank=True, max_length=20, unique=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "vehicle",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="repairs",
                        to="vehicles.vehicle",
                    ),
                ),
                (
                    "master",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="repairs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "repairs",
                "ordering": ("-created_at", "-id"),
            },
        ),
        migrations.CreateModel(
            name="RepairNote",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("author_name", models.CharField(max_length=255)),
                ("author_email", models.EmailField(max_length=254)),
                ("text", models.TextField()),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                (
                    "repair",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notes",
                        to="repairs.repair",
                    ),
                ),
                (
                    "author",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="repair_notes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "repair_notes",
                "ordering": ("created_at", "id"),
            },
        ),
    ]
