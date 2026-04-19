from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin

from .models import InvoiceLineParseTemplate, Purchase, Supplier, UnitOfMeasure


@admin.register(UnitOfMeasure)
class UnitOfMeasureAdmin(ModelAdmin):
    list_display = ("code", "name", "is_active", "sort_order")
    list_filter = ("is_active",)
    search_fields = ("code", "name")
    ordering = ("sort_order", "code")


@admin.register(Supplier)
class SupplierAdmin(ModelAdmin):
    list_display = ("name", "phone", "email", "registered_address", "created_at")
    search_fields = ("name", "phone", "email", "registered_address")
    readonly_fields = ("created_at", "updated_at")


@admin.register(InvoiceLineParseTemplate)
class InvoiceLineParseTemplateAdmin(ModelAdmin):
    list_display = ("name", "is_active", "sort_order", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name", "description", "line_pattern")


@admin.register(Purchase)
class PurchaseAdmin(ModelAdmin):
    list_display = (
        "order_date",
        "part_name",
        "supplier",
        "vehicle",
        "unit_of_measure",
        "quantity",
        "current_stock_quantity",
        "purchase_price",
        "sale_price",
        "is_shop_consumable",
        "invoice_link",
    )
    list_filter = ("order_date", "supplier", "is_shop_consumable")
    list_select_related = ("supplier", "vehicle", "unit_of_measure")
    search_fields = ("part_name", "supplier__name", "vehicle__license_plate", "repair_code")
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="Invoice")
    def invoice_link(self, obj):
        if obj.invoice_url:
            return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">View</a>', obj.invoice_url)
        return "—"
