import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("customers", "0001_initial"),
        ("users", "0002_alter_user_options_alter_user_groups"),
    ]

    operations = [
        migrations.AddField(
            model_name="customer",
            name="assigned_to",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_customers",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
