from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("repairs", "0009_repair_started_at"),
    ]

    operations = [
        migrations.AlterField(
            model_name="repair",
            name="status",
            field=models.CharField(
                choices=[
                    ("new", "New"),
                    ("in_progress", "In Progress"),
                    ("waiting_parts", "Waiting for Parts"),
                    ("completed", "Completed"),
                    ("picked_up", "Picked Up"),
                ],
                default="new",
                max_length=20,
            ),
        ),
    ]
