import secrets

from django.conf import settings
from django.db import models
from django.utils import timezone

from vehicles.models import Vehicle


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
