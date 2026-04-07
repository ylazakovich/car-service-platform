import secrets
from decimal import Decimal

from django.conf import settings
from django.db import models
from django.utils import timezone

from vehicles.models import Vehicle


def repair_pdf_upload_to(instance: "RepairDocument", filename: str) -> str:
    repair_id = instance.repair_id if instance.repair_id is not None else instance.repair.pk
    return f"repair_exports/{repair_id}/v{instance.version}.pdf"


class Repair(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "New"
        IN_PROGRESS = "in_progress", "In Progress"
        WAITING_PARTS = "waiting_parts", "Waiting for Parts"
        COMPLETED = "completed", "Completed"

    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name="repairs")
    master = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="repairs",
    )
    service_name = models.CharField(max_length=255)
    issue_notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW)
    mileage_at_service = models.PositiveIntegerField(null=True, blank=True)
    position = models.PositiveIntegerField(null=True, blank=True)
    tracking_code = models.CharField(max_length=20, unique=True, blank=True)
    portal_token = models.CharField(max_length=40, unique=True, blank=True)
    estimated_date = models.DateField(null=True, blank=True)
    completed_at = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "repairs"
        ordering = ("-created_at", "-id")

    def __str__(self):
        return f"{self.tracking_code} — {self.service_name}"

    def save(self, *args, **kwargs):
        if self.status != self.Status.COMPLETED:
            self.completed_at = None
        elif self.completed_at is None:
            previous = None
            if self.pk:
                previous = Repair.objects.filter(pk=self.pk).values("status", "completed_at").first()

            if previous and previous["completed_at"] is not None:
                self.completed_at = previous["completed_at"]
            else:
                self.completed_at = timezone.localdate()

        super().save(*args, **kwargs)
        updates: dict[str, str] = {}
        if not self.tracking_code:
            self.tracking_code = f"TOR-{self.pk:04d}"
            updates["tracking_code"] = self.tracking_code
        if not self.portal_token:
            self.portal_token = secrets.token_urlsafe(20)
            updates["portal_token"] = self.portal_token
        if updates:
            Repair.objects.filter(pk=self.pk).update(**updates)


class RepairServiceLine(models.Model):
    """One or more named services per repair; optional link to catalog Service for pricing."""

    repair = models.ForeignKey(Repair, on_delete=models.CASCADE, related_name="service_lines")
    name = models.CharField(max_length=255)
    catalog_service = models.ForeignKey(
        "services.Service",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="repair_line_usages",
    )
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "repair_service_lines"
        ordering = ("repair_id", "sort_order", "id")

    def __str__(self):
        return f"{self.repair_id}: {self.name}"


class RepairNote(models.Model):
    repair = models.ForeignKey(Repair, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="repair_notes",
    )
    author_name = models.CharField(max_length=255)
    author_email = models.EmailField()
    text = models.TextField()
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = "repair_notes"
        ordering = ("created_at", "id")

    def __str__(self):
        return f"Note by {self.author_email} on {self.repair}"


class RepairDocument(models.Model):
    """Stored PDF export for a completed repair; new row per export (versioned)."""

    repair = models.ForeignKey(Repair, on_delete=models.CASCADE, related_name="documents")
    version = models.PositiveIntegerField()
    file = models.FileField(upload_to=repair_pdf_upload_to)
    original_filename = models.CharField(max_length=255)
    exported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="exported_repair_documents",
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = "repair_documents"
        ordering = ("repair_id", "version")
        constraints = [
            models.UniqueConstraint(fields=("repair", "version"), name="uniq_repair_document_version"),
        ]

    def __str__(self):
        return f"{self.repair.tracking_code} v{self.version}"


class RepairFinancialSnapshot(models.Model):
    """Immutable financial totals at export time; pairs 1:1 with RepairDocument."""

    repair = models.ForeignKey(Repair, on_delete=models.CASCADE, related_name="financial_snapshots")
    document = models.OneToOneField(
        RepairDocument,
        on_delete=models.CASCADE,
        related_name="financial_snapshot",
    )
    labor_total = models.DecimalField(max_digits=12, decimal_places=2)
    parts_client_total = models.DecimalField(max_digits=12, decimal_places=2)
    parts_purchase_total = models.DecimalField(max_digits=12, decimal_places=2)
    other_expenses_total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    document_total = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = "repair_financial_snapshots"
        ordering = ("repair_id", "document__version")

    def __str__(self):
        return f"Snapshot {self.repair.tracking_code} doc#{self.document_id}"
