from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("repairs", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="repair",
            name="completed_at",
            field=models.DateField(blank=True, null=True),
        ),
    ]
