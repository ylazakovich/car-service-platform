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
    tracking_code = models.CharField(max_length=20, unique=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "repairs"
        ordering = ("-created_at", "-id")

    def __str__(self):
        return f"{self.tracking_code} — {self.service_name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.tracking_code:
            self.tracking_code = f"TOR-{self.pk:04d}"
            Repair.objects.filter(pk=self.pk).update(tracking_code=self.tracking_code)


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
