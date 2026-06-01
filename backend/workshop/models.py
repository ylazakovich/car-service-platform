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
        return cls.objects.first()
