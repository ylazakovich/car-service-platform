from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from customers.models import Customer
from purchases.models import Purchase, Supplier
from .models import Vehicle


class VehicleApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="manager@test.local",
            password="manager12345",
            role="staff",
        )
        self.customer = Customer.objects.create(
            full_name="Alex Johnson",
            phone="+48 555 100 200",
            assigned_to=self.user,
        )

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
        self.assertEqual(len(list_response.json()["results"]), 2)

        search_response = self.client.get("/api/vehicles/", {"q": "toyota"})
        self.assertEqual(search_response.status_code, 200)
        self.assertEqual(len(search_response.json()["results"]), 1)
        self.assertEqual(search_response.json()["results"][0]["license_plate"], "WB 1234K")

        update_response = self.client.patch(
            f"/api/vehicles/{vehicle_id}",
            {"color": "Graphite"},
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["color"], "Graphite")

    def test_create_vehicle_with_extra_fields(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/vehicles/",
            {
                "customer_id": self.customer.id,
                "license_plate": "AA 0001B",
                "make": "BMW",
                "model": "320i",
                "year": 2020,
                "mileage": 78210,
                "last_service_date": "2025-01-15",
                "added_date": "2024-11-04",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["mileage"], 78210)
        self.assertEqual(data["last_service_date"], "2025-01-15")
        self.assertEqual(data["added_date"], "2024-11-04")

    def test_update_vehicle_extra_fields(self):
        self.client.force_authenticate(self.user)

        create_response = self.client.post(
            "/api/vehicles/",
            {
                "customer_id": self.customer.id,
                "license_plate": "BB 2222C",
                "make": "Audi",
                "model": "A4",
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        vehicle_id = create_response.json()["id"]

        patch_response = self.client.patch(
            f"/api/vehicles/{vehicle_id}",
            {
                "mileage": 50000,
                "last_service_date": "2025-06-01",
            },
            format="json",
        )

        self.assertEqual(patch_response.status_code, 200)
        data = patch_response.json()
        self.assertEqual(data["mileage"], 50000)
        self.assertEqual(data["last_service_date"], "2025-06-01")

    def test_extra_fields_nullable(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/vehicles/",
            {
                "customer_id": self.customer.id,
                "license_plate": "CC 3333D",
                "make": "Ford",
                "model": "Focus",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIsNone(data["mileage"])
        self.assertIsNone(data["last_service_date"])
        self.assertIsNone(data["added_date"])

    def test_extra_fields_returned_on_list(self):
        self.client.force_authenticate(self.user)

        self.client.post(
            "/api/vehicles/",
            {
                "customer_id": self.customer.id,
                "license_plate": "DD 4444E",
                "make": "Honda",
                "model": "Civic",
                "mileage": 12000,
            },
            format="json",
        )

        list_response = self.client.get("/api/vehicles/")

        self.assertEqual(list_response.status_code, 200)
        vehicles = list_response.json()["results"]
        self.assertEqual(len(vehicles), 1)
        self.assertEqual(vehicles[0]["mileage"], 12000)


class VehicleOwnershipTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        User = get_user_model()
        self.staff_a = User.objects.create_user(
            email="staff_a@test.local",
            password="staff_a12345",
            role="staff",
        )
        self.staff_b = User.objects.create_user(
            email="staff_b@test.local",
            password="staff_b12345",
            role="staff",
        )
        self.admin = User.objects.create_user(
            email="admin@test.local",
            password="admin12345",
            role="admin",
        )
        self.customer_of_a = Customer.objects.create(
            full_name="Customer A",
            phone="+48 100 000 001",
            assigned_to=self.staff_a,
        )
        self.customer_of_b = Customer.objects.create(
            full_name="Customer B",
            phone="+48 100 000 002",
            assigned_to=self.staff_b,
        )

    def test_staff_cannot_create_vehicle_for_others_customer(self):
        self.client.force_authenticate(self.staff_a)

        response = self.client.post(
            "/api/vehicles/",
            {
                "customer_id": self.customer_of_b.id,
                "license_plate": "EE 1111A",
                "make": "Ford",
                "model": "Focus",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_staff_can_create_vehicle_for_own_customer(self):
        self.client.force_authenticate(self.staff_a)

        response = self.client.post(
            "/api/vehicles/",
            {
                "customer_id": self.customer_of_a.id,
                "license_plate": "FF 2222B",
                "make": "Opel",
                "model": "Astra",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

    def test_admin_can_create_vehicle_for_any_customer(self):
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/vehicles/",
            {
                "customer_id": self.customer_of_b.id,
                "license_plate": "GG 3333C",
                "make": "Nissan",
                "model": "Leaf",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

    def test_delete_vehicle_with_linked_purchases_returns_409(self):
        self.client.force_authenticate(self.admin)

        vehicle = Vehicle.objects.create(
            customer=self.customer_of_a,
            license_plate="HH 4444D",
            make="Mazda",
            model="CX-5",
        )

        supplier = Supplier.objects.create(
            name="TestSupplier",
            nip="1234567890",
        )

        Purchase.objects.create(
            vehicle=vehicle,
            supplier=supplier,
            order_date="2025-01-01",
            part_name="Engine Oil",
            quantity=2,
            purchase_price="25.50",
        )

        response = self.client.delete(f"/api/vehicles/{vehicle.id}")

        self.assertEqual(response.status_code, 409)
