from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Vehicle


@admin.register(Vehicle)
class VehicleAdmin(ModelAdmin):
    list_display = ("license_plate", "make", "model", "customer", "created_at")
    list_select_related = ("customer",)
    search_fields = ("license_plate", "make", "model", "vin", "customer__full_name")
    readonly_fields = ("created_at", "updated_at")
