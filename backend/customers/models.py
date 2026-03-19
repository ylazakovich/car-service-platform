from django.conf import settings
from django.db import models
from django.utils import timezone


class Customer(models.Model):
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True)
    notes = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_customers",
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "customers"
        ordering = ("full_name", "id")

    def __str__(self):
        return self.full_name
