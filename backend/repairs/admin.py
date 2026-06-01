from django.contrib import admin
from unfold.admin import ModelAdmin, StackedInline, TabularInline

from .models import Repair, RepairDocument, RepairFinancialSnapshot, RepairNote, RepairServiceLine


class RepairServiceLineInline(TabularInline):
    model = RepairServiceLine
    extra = 0
    fields = ("name", "catalog_service", "sort_order")


class RepairNoteInline(TabularInline):
    model = RepairNote
    extra = 0
    fields = ("author", "author_name", "author_email", "text", "created_at")
    readonly_fields = ("created_at",)


class RepairDocumentInline(TabularInline):
    model = RepairDocument
    extra = 0
    fields = ("file", "version", "created_at")
    readonly_fields = ("version", "created_at")


class RepairFinancialSnapshotInline(StackedInline):
    model = RepairFinancialSnapshot
    extra = 0
    can_delete = False
    fields = (
        "document",
        "labor_total",
        "parts_client_total",
        "parts_purchase_total",
        "other_expenses_total",
        "document_total",
        "created_at",
    )
    readonly_fields = (
        "document",
        "labor_total",
        "parts_client_total",
        "parts_purchase_total",
        "other_expenses_total",
        "document_total",
        "created_at",
    )


@admin.register(Repair)
class RepairAdmin(ModelAdmin):
    list_display = ("tracking_code", "service_name", "vehicle", "status", "created_at")
    list_filter = ("status",)
    list_select_related = ("vehicle",)
    search_fields = ("tracking_code", "service_name", "vehicle__license_plate")
    readonly_fields = ("tracking_code", "portal_token", "created_at")
    ordering = ("-created_at",)
    inlines = (
        RepairServiceLineInline,
        RepairNoteInline,
        RepairDocumentInline,
        RepairFinancialSnapshotInline,
    )


@admin.register(RepairFinancialSnapshot)
class RepairFinancialSnapshotAdmin(ModelAdmin):
    list_display = ("repair", "document", "document_total", "created_at")
    list_select_related = ("repair", "document")
    readonly_fields = (
        "repair",
        "document",
        "labor_total",
        "parts_client_total",
        "parts_purchase_total",
        "other_expenses_total",
        "document_total",
        "created_at",
    )
    ordering = ("-created_at",)
