from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("vehicles", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Supplier",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255, unique=True)),
                ("phone", models.CharField(blank=True, max_length=50)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "suppliers",
                "ordering": ("name", "id"),
            },
        ),
        migrations.CreateModel(
            name="Purchase",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("order_date", models.DateField()),
                ("part_name", models.CharField(max_length=255)),
                ("quantity", models.PositiveIntegerField(default=1)),
                ("purchase_price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("sale_price", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("repair_code", models.CharField(blank=True, max_length=32)),
                ("invoice_name", models.CharField(blank=True, max_length=255)),
                ("invoice_url", models.URLField(blank=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "supplier",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="purchases", to="purchases.supplier"),
                ),
                (
                    "vehicle",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="purchases",
                        to="vehicles.vehicle",
                    ),
                ),
            ],
            options={
                "db_table": "purchases",
                "ordering": ("-order_date", "-id"),
            },
        ),
    ]
