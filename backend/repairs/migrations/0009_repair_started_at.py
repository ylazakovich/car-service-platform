from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("repairs", "0008_repairserviceline"),
    ]

    operations = [
        migrations.AddField(
            model_name="repair",
            name="started_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
