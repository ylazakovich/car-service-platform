import secrets

from django.db import migrations, models


def populate_portal_tokens(apps, schema_editor):
    Repair = apps.get_model("repairs", "Repair")
    for repair in Repair.objects.filter(portal_token__isnull=True):
        repair.portal_token = secrets.token_urlsafe(20)
        repair.save(update_fields=["portal_token"])


class Migration(migrations.Migration):

    dependencies = [
        ("repairs", "0004_add_repair_position"),
    ]

    operations = [
        migrations.AddField(
            model_name="repair",
            name="portal_token",
            field=models.CharField(blank=True, max_length=40, null=True),
        ),
        migrations.RunPython(populate_portal_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="repair",
            name="portal_token",
            field=models.CharField(blank=True, max_length=40, unique=True),
        ),
    ]
