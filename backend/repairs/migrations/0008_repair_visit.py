import secrets

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


def forwards_visits(apps, schema_editor):
    Repair = apps.get_model("repairs", "Repair")
    RepairVisit = apps.get_model("repairs", "RepairVisit")
    for r in Repair.objects.all().order_by("pk"):
        visit = RepairVisit.objects.create(
            vehicle_id=r.vehicle_id,
            completed_at=r.completed_at if r.status == "completed" else None,
        )
        tc = (getattr(r, "tracking_code", None) or "").strip()
        pt = (getattr(r, "portal_token", None) or "").strip()
        if not tc:
            tc = f"TOR-{visit.pk:04d}"
        if not pt:
            pt = secrets.token_urlsafe(20)
        RepairVisit.objects.filter(pk=visit.pk).update(tracking_code=tc, portal_token=pt)
        r.visit_id = visit.pk
        r.save(update_fields=["visit_id"])


def forwards_documents(apps, schema_editor):
    RepairDocument = apps.get_model("repairs", "RepairDocument")
    Repair = apps.get_model("repairs", "Repair")
    for doc in RepairDocument.objects.all():
        r = Repair.objects.get(pk=doc.repair_id)
        doc.visit_id = r.visit_id
        doc.save(update_fields=["visit_id"])


def forwards_snapshots(apps, schema_editor):
    RepairFinancialSnapshot = apps.get_model("repairs", "RepairFinancialSnapshot")
    Repair = apps.get_model("repairs", "Repair")
    for snap in RepairFinancialSnapshot.objects.all():
        r = Repair.objects.get(pk=snap.repair_id)
        snap.visit_id = r.visit_id
        snap.save(update_fields=["visit_id"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("repairs", "0007_repair_document_and_financial_snapshot"),
        ("vehicles", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="RepairVisit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("tracking_code", models.CharField(blank=True, max_length=20, unique=True)),
                ("portal_token", models.CharField(blank=True, max_length=40, unique=True)),
                ("completed_at", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "vehicle",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="repair_visits",
                        to="vehicles.vehicle",
                    ),
                ),
            ],
            options={
                "db_table": "repair_visits",
                "ordering": ("-created_at", "-id"),
            },
        ),
        migrations.AddField(
            model_name="repair",
            name="visit",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="repairs",
                to="repairs.repairvisit",
            ),
        ),
        migrations.AddField(
            model_name="repairdocument",
            name="visit",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="documents",
                to="repairs.repairvisit",
            ),
        ),
        migrations.AddField(
            model_name="repairfinancialsnapshot",
            name="visit",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="financial_snapshots",
                to="repairs.repairvisit",
            ),
        ),
        migrations.RunPython(forwards_visits, noop_reverse),
        migrations.AlterField(
            model_name="repair",
            name="visit",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="repairs",
                to="repairs.repairvisit",
            ),
        ),
        migrations.RunPython(forwards_documents, noop_reverse),
        migrations.RemoveConstraint(
            model_name="repairdocument",
            name="uniq_repair_document_version",
        ),
        migrations.RemoveField(
            model_name="repairdocument",
            name="repair",
        ),
        migrations.AlterField(
            model_name="repairdocument",
            name="visit",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="documents",
                to="repairs.repairvisit",
            ),
        ),
        migrations.AddConstraint(
            model_name="repairdocument",
            constraint=models.UniqueConstraint(fields=("visit", "version"), name="uniq_visit_document_version"),
        ),
        migrations.RunPython(forwards_snapshots, noop_reverse),
        migrations.RemoveField(
            model_name="repairfinancialsnapshot",
            name="repair",
        ),
        migrations.AlterField(
            model_name="repairfinancialsnapshot",
            name="visit",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="financial_snapshots",
                to="repairs.repairvisit",
            ),
        ),
        migrations.RemoveField(
            model_name="repair",
            name="portal_token",
        ),
        migrations.RemoveField(
            model_name="repair",
            name="tracking_code",
        ),
    ]
