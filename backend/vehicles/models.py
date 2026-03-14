from django.db import models
from django.utils import timezone

from customers.models import Customer


class Vehicle(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name="vehicles")
    license_plate = models.CharField(max_length=20, unique=True)
    make = models.CharField(max_length=120)
    model = models.CharField(max_length=120)
    year = models.PositiveSmallIntegerField(null=True, blank=True)
    vin = models.CharField(max_length=64, blank=True)
    color = models.CharField(max_length=64, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vehicles"
        ordering = ("license_plate", "id")

    def __str__(self):
        return f"{self.license_plate} - {self.make} {self.model}"

    def save(self, *args, **kwargs):
        self.license_plate = " ".join(self.license_plate.upper().split())
        super().save(*args, **kwargs)
