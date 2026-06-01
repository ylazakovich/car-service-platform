from django.core.exceptions import ImproperlyConfigured
from django.db import models


class WorkshopSettings(models.Model):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, blank=True)
    address = models.CharField(max_length=300, blank=True)
    maps_url = models.URLField(blank=True)

    class Meta:
        verbose_name = "Workshop settings"
        verbose_name_plural = "Workshop settings"

    def __str__(self):
        return self.name

    @classmethod
    def get(cls):
        settings = list(cls.objects.all()[:2])
        if not settings:
            return None
        if len(settings) > 1:
            raise ImproperlyConfigured(
                "Multiple WorkshopSettings rows exist; consolidate them into a single row."
            )
        return settings[0]
