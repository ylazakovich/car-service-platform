from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from customers.models import Customer
from vehicles.models import Vehicle

from .models import Purchase, Supplier


class SupplierApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="manager@test.local",
            password="manager12345",
            role="staff",
        )

    def test_list_suppliers(self):
        self.client.force_authenticate(self.user)
        Supplier.objects.create(name="AutoParts Ltd")
        Supplier.objects.create(name="SpeedSupply Co")

        response = self.client.get("/api/purchases/suppliers/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)

    def test_create_supplier(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/purchases/suppliers/",
            {"name": "TopGear Parts", "nip": "1234567890", "phone": "+48 600 100 200"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["name"], "TopGear Parts")
        self.assertEqual(data["nip"], "1234567890")
        self.assertEqual(data["phone"], "+48 600 100 200")

    def test_detail_supplier(self):
        self.client.force_authenticate(self.user)
        supplier = Supplier.objects.create(name="Detail Supplier", nip="9876543210")

        response = self.client.get(f"/api/purchases/suppliers/{supplier.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Detail Supplier")
        self.assertEqual(response.json()["nip"], "9876543210")

    def test_search_suppliers_by_name(self):
        self.client.force_authenticate(self.user)
        Supplier.objects.create(name="AutoParts Ltd")
        Supplier.objects.create(name="SpeedSupply Co")

        response = self.client.get("/api/purchases/suppliers/", {"q": "auto"})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["name"], "AutoParts Ltd")


class PurchaseApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="manager@test.local",
            password="manager12345",
            role="staff",
        )
        self.supplier = Supplier.objects.create(name="Existing Supplier", nip="1111111111")
        self.customer = Customer.objects.create(
            full_name="Jan Kowalski",
            phone="+48 555 000 111",
            assigned_to=self.user,
        )
        self.vehicle = Vehicle.objects.create(
            customer=self.customer,
            license_plate="WA 12345",
            make="Ford",
            model="Focus",
        )

    def _purchase_payload(self, **overrides):
        payload = {
            "order_date": "2026-03-20",
            "part_name": "Brake Disc",
            "quantity": 2,
            "purchase_price": "89.99",
            "supplier_name": self.supplier.name,
        }
        payload.update(overrides)
        return payload

    def test_authentication_is_required(self):
        response = self.client.get("/api/purchases/")
        self.assertEqual(response.status_code, 403)

    def test_list_purchases(self):
        self.client.force_authenticate(self.user)
        Purchase.objects.create(
            order_date="2026-03-20",
            part_name="Air Filter",
            quantity=1,
            purchase_price="15.00",
            supplier=self.supplier,
        )

        response = self.client.get("/api/purchases/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["results"]), 1)

    def test_create_purchase_with_new_supplier_name_auto_creates_supplier(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/purchases/",
            self._purchase_payload(supplier_name="Brand New Supplier"),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Supplier.objects.filter(name="Brand New Supplier").exists())
        self.assertEqual(response.json()["supplier"]["name"], "Brand New Supplier")

    def test_create_purchase_with_existing_supplier_name_reuses_supplier(self):
        self.client.force_authenticate(self.user)
        supplier_count_before = Supplier.objects.count()

        response = self.client.post(
            "/api/purchases/",
            self._purchase_payload(supplier_name=self.supplier.name),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Supplier.objects.count(), supplier_count_before)
        self.assertEqual(response.json()["supplier"]["name"], self.supplier.name)

    def test_search_filters_by_part_name(self):
        self.client.force_authenticate(self.user)
        Purchase.objects.create(
            order_date="2026-03-20",
            part_name="Brake Pad",
            quantity=4,
            purchase_price="45.00",
            supplier=self.supplier,
        )
        Purchase.objects.create(
            order_date="2026-03-21",
            part_name="Air Filter",
            quantity=1,
            purchase_price="12.00",
            supplier=self.supplier,
        )

        response = self.client.get("/api/purchases/", {"q": "brake"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["results"]), 1)
        self.assertEqual(response.json()["results"][0]["part_name"], "Brake Pad")

    def test_detail_returns_nested_supplier_data(self):
        self.client.force_authenticate(self.user)
        purchase = Purchase.objects.create(
            order_date="2026-03-20",
            part_name="Spark Plug",
            quantity=4,
            purchase_price="8.50",
            supplier=self.supplier,
        )

        response = self.client.get(f"/api/purchases/{purchase.id}")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["part_name"], "Spark Plug")
        self.assertIsInstance(data["supplier"], dict)
        self.assertEqual(data["supplier"]["name"], self.supplier.name)
        self.assertEqual(data["supplier"]["nip"], self.supplier.nip)

    def test_update_purchase_part_name(self):
        self.client.force_authenticate(self.user)
        purchase = Purchase.objects.create(
            order_date="2026-03-20",
            part_name="Old Part",
            quantity=1,
            purchase_price="20.00",
            supplier=self.supplier,
        )

        response = self.client.patch(
            f"/api/purchases/{purchase.id}",
            {"part_name": "New Part"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["part_name"], "New Part")

    def test_delete_purchase(self):
        self.client.force_authenticate(self.user)
        purchase = Purchase.objects.create(
            order_date="2026-03-20",
            part_name="Disposable Part",
            quantity=1,
            purchase_price="5.00",
            supplier=self.supplier,
        )

        response = self.client.delete(f"/api/purchases/{purchase.id}")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Purchase.objects.filter(id=purchase.id).exists())
