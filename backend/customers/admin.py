from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(ModelAdmin):
    list_display = ("full_name", "phone", "email", "created_at")
    search_fields = ("full_name", "phone", "email")
    readonly_fields = ("created_at", "updated_at")
