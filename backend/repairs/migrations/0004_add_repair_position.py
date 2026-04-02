from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('repairs', '0003_add_mileage_at_service'),
    ]

    operations = [
        migrations.AddField(
            model_name='repair',
            name='position',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
