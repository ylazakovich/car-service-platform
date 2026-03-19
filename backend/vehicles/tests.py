from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from customers.models import Customer
from .models import Vehicle


class VehicleApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="manager@test.local",
            password="manager12345",
            role="staff",
        )
        self.customer = Customer.objects.create(full_name="Alex Johnson", phone="+48 555 100 200")

    def test_staff_can_create_list_search_and_update_vehicles(self):
        self.client.force_authenticate(self.user)

        create_response = self.client.post(
            "/api/vehicles/",
            {
                "customer_id": self.customer.id,
                "license_plate": "  wb 1234k ",
                "make": "Toyota",
                "model": "Corolla",
                "year": 2018,
                "vin": "JTDBR32E720054321",
                "color": "White",
                "notes": "Primary family car.",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        vehicle_id = create_response.json()["id"]
        self.assertEqual(create_response.json()["license_plate"], "WB 1234K")
        self.assertEqual(create_response.json()["customer"]["full_name"], self.customer.full_name)

        Vehicle.objects.create(
            customer=self.customer,
            license_plate="WX 9000A",
            make="Skoda",
            model="Octavia",
        )

        list_response = self.client.get("/api/vehicles/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 2)

        search_response = self.client.get("/api/vehicles/", {"q": "toyota"})
        self.assertEqual(search_response.status_code, 200)
        self.assertEqual(len(search_response.json()), 1)
        self.assertEqual(search_response.json()[0]["license_plate"], "WB 1234K")

        update_response = self.client.patch(
            f"/api/vehicles/{vehicle_id}",
            {"color": "Graphite"},
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["color"], "Graphite")
