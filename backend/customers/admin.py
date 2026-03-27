from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(ModelAdmin):
    list_display = ("full_name", "phone", "email", "assigned_to", "created_at")
    list_select_related = ("assigned_to",)
    search_fields = ("full_name", "phone", "email")
    readonly_fields = ("created_at", "updated_at")
