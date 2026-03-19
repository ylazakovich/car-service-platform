from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Customer


class CustomerApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="manager@test.local",
            password="manager12345",
            role="staff",
        )

    def test_authentication_is_required(self):
        response = self.client.get("/api/customers/")
        self.assertEqual(response.status_code, 403)

    def test_staff_can_create_list_search_and_update_customers(self):
        self.client.force_authenticate(self.user)

        create_response = self.client.post(
            "/api/customers/",
            {
                "full_name": "Alex Johnson",
                "phone": "+48 555 100 200",
                "email": "alex@example.com",
                "notes": "Prefers call after diagnostics.",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        customer_id = create_response.json()["id"]

        Customer.objects.create(full_name="Maria Hill", phone="+48 555 333 444")

        list_response = self.client.get("/api/customers/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 2)
        self.assertEqual(list_response.json()[0]["vehicle_count"], 0)

        search_response = self.client.get("/api/customers/", {"q": "alex"})
        self.assertEqual(search_response.status_code, 200)
        self.assertEqual(len(search_response.json()), 1)
        self.assertEqual(search_response.json()[0]["full_name"], "Alex Johnson")

        update_response = self.client.patch(
            f"/api/customers/{customer_id}",
            {"phone": "+48 555 999 000"},
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["phone"], "+48 555 999 000")

    def test_customer_with_vehicles_cannot_be_deleted(self):
        self.client.force_authenticate(self.user)
        customer = Customer.objects.create(full_name="Vehicle Owner", phone="+48 555 222 333")
        customer.vehicles.create(license_plate="WX 1234A", make="Audi", model="A4")

        delete_response = self.client.delete(f"/api/customers/{customer.id}")

        self.assertEqual(delete_response.status_code, 409)
