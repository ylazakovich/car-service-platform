from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Service


class ServiceApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="manager@test.local",
            password="manager12345",
            role="staff",
        )

    def test_authentication_is_required(self):
        response = self.client.get("/api/services/")
        self.assertEqual(response.status_code, 403)

    def test_list_returns_all_services(self):
        self.client.force_authenticate(self.user)
        Service.objects.create(name="Oil Change", description="Engine oil replacement", is_active=True)
        Service.objects.create(name="Brake Pad Replacement", description="Front brake pads", is_active=True)

        response = self.client.get("/api/services/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)

    def test_search_returns_only_matching_services(self):
        self.client.force_authenticate(self.user)
        Service.objects.create(name="Oil Change", description="Engine oil replacement", is_active=True)
        Service.objects.create(name="Brake Pad Replacement", description="Front brake pads", is_active=True)

        response = self.client.get("/api/services/", {"q": "oil"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["name"], "Oil Change")

    def test_create_service(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/services/",
            {"name": "Wheel Alignment", "description": "Four-wheel alignment service", "is_active": True},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["name"], "Wheel Alignment")
        self.assertEqual(data["description"], "Four-wheel alignment service")
        self.assertTrue(data["is_active"])
        self.assertIn("id", data)
        self.assertIn("created_at", data)

    def test_detail_returns_service(self):
        self.client.force_authenticate(self.user)
        service = Service.objects.create(name="Tire Rotation", is_active=True)

        response = self.client.get(f"/api/services/{service.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Tire Rotation")

    def test_update_service_name(self):
        self.client.force_authenticate(self.user)
        service = Service.objects.create(name="Old Name", is_active=True)

        response = self.client.patch(
            f"/api/services/{service.id}",
            {"name": "Updated Name"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Updated Name")

    def test_delete_service(self):
        self.client.force_authenticate(self.user)
        service = Service.objects.create(name="Temporary Service", is_active=True)

        response = self.client.delete(f"/api/services/{service.id}")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Service.objects.filter(id=service.id).exists())
