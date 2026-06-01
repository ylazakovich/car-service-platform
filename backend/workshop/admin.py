from django.contrib import admin

from .models import WorkshopSettings


@admin.register(WorkshopSettings)
class WorkshopSettingsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not WorkshopSettings.objects.exists()
