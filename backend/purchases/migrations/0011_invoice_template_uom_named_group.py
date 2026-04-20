# Capture JM / unit column as (?P<uom>...) for catalog resolution.

from django.db import migrations

NEW_PATTERN = (
    r"^\s*\d+\s*\|\s*(?P<part_name>.+?)\s*\|\s*(?P<quantity>\d+)\s*\|\s*(?P<uom>\S+)\s*\|\s*"
    r"[\d\s.,]+\s*\|\s*(?P<purchase_price>[\d\s.,]+)"
)


def forwards(apps, schema_editor):
    InvoiceLineParseTemplate = apps.get_model("purchases", "InvoiceLineParseTemplate")
    InvoiceLineParseTemplate.objects.filter(name="Pipe table (demo PL)").update(line_pattern=NEW_PATTERN)


def backwards(apps, schema_editor):
    old = (
        r"^\s*\d+\s*\|\s*(?P<part_name>.+?)\s*\|\s*(?P<quantity>\d+)\s*\|\s*\S+\s*\|\s*"
        r"[\d\s.,]+\s*\|\s*(?P<purchase_price>[\d\s.,]+)"
    )
    InvoiceLineParseTemplate = apps.get_model("purchases", "InvoiceLineParseTemplate")
    InvoiceLineParseTemplate.objects.filter(name="Pipe table (demo PL)").update(line_pattern=old)


class Migration(migrations.Migration):

    dependencies = [
        ("purchases", "0010_invoice_line_parse_template_supplier"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
