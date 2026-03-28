from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Service


@admin.register(Service)
class ServiceAdmin(ModelAdmin):
    list_display = ("name", "price", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("name", "description", "price", "is_active")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

