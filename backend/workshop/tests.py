from django.contrib import admin
from django.core.exceptions import ImproperlyConfigured
from django.test import TestCase

from .admin import WorkshopSettingsAdmin
from .models import WorkshopSettings


class WorkshopSettingsTests(TestCase):
    def test_get_returns_none_when_not_configured(self):
        self.assertIsNone(WorkshopSettings.get())

    def test_get_returns_single_settings_row(self):
        settings = WorkshopSettings.objects.create(name="Test Shop")

        self.assertEqual(WorkshopSettings.get(), settings)

    def test_get_raises_when_duplicate_settings_exist(self):
        WorkshopSettings.objects.create(name="First Shop")
        WorkshopSettings.objects.create(name="Second Shop")

        with self.assertRaisesMessage(
            ImproperlyConfigured,
            "Multiple WorkshopSettings rows exist; consolidate them into a single row.",
        ):
            WorkshopSettings.get()


class WorkshopSettingsAdminTests(TestCase):
    def test_add_permission_is_allowed_until_settings_exist(self):
        model_admin = WorkshopSettingsAdmin(WorkshopSettings, admin.site)

        self.assertTrue(model_admin.has_add_permission(request=None))

    def test_add_permission_is_blocked_when_settings_exist(self):
        WorkshopSettings.objects.create(name="Test Shop")
        model_admin = WorkshopSettingsAdmin(WorkshopSettings, admin.site)

        self.assertFalse(model_admin.has_add_permission(request=None))
