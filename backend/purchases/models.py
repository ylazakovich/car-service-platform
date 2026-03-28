from django.db import models
from django.utils import timezone

from vehicles.models import Vehicle


class Supplier(models.Model):
    name = models.CharField(max_length=255, unique=True)
    nip = models.CharField(max_length=50, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "suppliers"
        ordering = ("name", "id")

    def __str__(self):
        return self.name


class Purchase(models.Model):
    order_date = models.DateField()
    approximate_delivery_date = models.DateField(null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name="purchases")
    vehicle = models.ForeignKey(
        Vehicle,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="purchases",
    )
    part_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(default=1)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    repair_code = models.CharField(max_length=32, blank=True)
    invoice_name = models.CharField(max_length=255, blank=True)
    invoice_url = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "purchases"
        ordering = ("-order_date", "-id")

    def __str__(self):
        return f"{self.part_name} ({self.order_date})"

