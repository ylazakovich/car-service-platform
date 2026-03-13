from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient


class HealthViewTests(TestCase):
    def test_health_endpoint_is_public(self):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")


class VersionViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="admin@test.local",
            password="admin12345",
            role="admin",
            is_staff=True,
            is_superuser=True,
        )

    def test_version_endpoint_requires_admin(self):
        response = self.client.get("/api/version")
        self.assertEqual(response.status_code, 403)

        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/version")
        self.assertEqual(response.status_code, 200)
        self.assertIn("django", response.json())
