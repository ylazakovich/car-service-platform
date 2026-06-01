from django.contrib import admin

from .models import WorkshopSettings


@admin.register(WorkshopSettings)
class WorkshopSettingsAdmin(admin.ModelAdmin):
    pass
