from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("repairs", "0005_add_portal_token"),
    ]

    operations = [
        migrations.AddField(
            model_name="repair",
            name="estimated_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
