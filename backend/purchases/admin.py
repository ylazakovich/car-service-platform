from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Purchase, Supplier


@admin.register(Supplier)
class SupplierAdmin(ModelAdmin):
    list_display = ("name", "phone", "email", "created_at")
    search_fields = ("name", "phone", "email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Purchase)
class PurchaseAdmin(ModelAdmin):
    list_display = ("order_date", "part_name", "supplier", "vehicle", "quantity", "purchase_price", "sale_price")
    list_filter = ("order_date", "supplier")
    list_select_related = ("supplier", "vehicle")
    search_fields = ("part_name", "supplier__name", "vehicle__license_plate", "repair_code")
    readonly_fields = ("created_at", "updated_at")

