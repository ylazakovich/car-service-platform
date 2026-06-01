from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from unfold.admin import ModelAdmin

from .models import InviteToken, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin, ModelAdmin):
    ordering = ("email",)
    list_display = ("email", "role", "is_staff", "is_active", "created_at")
    search_fields = ("email",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("first_name", "last_name", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "created_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "role", "is_staff", "is_superuser"),
            },
        ),
    )
    readonly_fields = ("created_at",)


@admin.register(InviteToken)
class InviteTokenAdmin(ModelAdmin):
    list_display = ("user", "token", "expires_at", "created_at")
    search_fields = ("user__email",)
    readonly_fields = ("token", "created_at", "expires_at")
