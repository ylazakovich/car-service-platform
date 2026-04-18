from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from customers.models import Customer
from vehicles.models import Vehicle

from .models import Purchase, Supplier, UnitOfMeasure


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
            {
                "name": "TopGear Parts",
                "nip": "1234567890",
                "phone": "+48 600 100 200",
                "registered_address": "ul. Prosta 1, 00-001 Warszawa",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["name"], "TopGear Parts")
        self.assertEqual(data["nip"], "1234567890")
        self.assertEqual(data["phone"], "+48 600 100 200")
        self.assertEqual(data["registered_address"], "ul. Prosta 1, 00-001 Warszawa")

    def test_detail_supplier(self):
        self.client.force_authenticate(self.user)
        supplier = Supplier.objects.create(
            name="Detail Supplier",
            nip="9876543210",
            registered_address="ul. Testowa 5, Krakow",
        )

        response = self.client.get(f"/api/purchases/suppliers/{supplier.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Detail Supplier")
        self.assertEqual(response.json()["nip"], "9876543210")
        self.assertEqual(response.json()["registered_address"], "ul. Testowa 5, Krakow")

    def test_update_supplier(self):
        self.client.force_authenticate(self.user)
        supplier = Supplier.objects.create(name="Old Supplier", nip="111")

        response = self.client.patch(
            f"/api/purchases/suppliers/{supplier.id}",
            {
                "name": "Updated Supplier",
                "phone": "+48 600 222 333",
                "registered_address": "Updated address 10",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Updated Supplier")
        self.assertEqual(response.json()["phone"], "+48 600 222 333")
        self.assertEqual(response.json()["registered_address"], "Updated address 10")
        supplier.refresh_from_db()
        self.assertEqual(supplier.name, "Updated Supplier")
        self.assertEqual(supplier.registered_address, "Updated address 10")

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
        self.uom_pcs = UnitOfMeasure.objects.get(code="pcs")

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
            unit_of_measure=self.uom_pcs,
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

    def test_bulk_create_purchases_shared_invoice(self):
        self.client.force_authenticate(self.user)
        supplier_count_before = Supplier.objects.count()

        response = self.client.post(
            "/api/purchases/bulk/",
            {
                "order_date": "2026-04-01",
                "supplier_name": "Bulk Supplier",
                "invoice_name": "inv.pdf",
                "invoice_url": "https://example.com/inv.pdf",
                "delivered": True,
                "is_shop_consumable": False,
                "lines": [
                    {
                        "part_name": "Part A",
                        "quantity": 2,
                        "purchase_price": "10.00",
                        "sale_price": "15.00",
                        "vehicle_id": self.vehicle.id,
                        "repair_code": "TOR-1001",
                    },
                    {
                        "part_name": "Part B",
                        "quantity": 1,
                        "purchase_price": "5.50",
                        "sale_price": "8.00",
                    },
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["part_name"], "Part A")
        self.assertEqual(data[1]["part_name"], "Part B")
        self.assertEqual(data[0]["invoice_name"], "inv.pdf")
        self.assertEqual(data[1]["invoice_name"], "inv.pdf")
        self.assertTrue(data[0]["delivered"])
        self.assertEqual(Supplier.objects.filter(name="Bulk Supplier").count(), 1)
        self.assertEqual(Supplier.objects.count(), supplier_count_before + 1)

    def test_bulk_create_shop_consumables_rejects_vehicle(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/purchases/bulk/",
            {
                "order_date": "2026-04-02",
                "supplier_name": "Chem Co",
                "is_shop_consumable": True,
                "lines": [
                    {
                        "part_name": "Gloves",
                        "quantity": 5,
                        "purchase_price": "1.00",
                        "vehicle_id": self.vehicle.id,
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_purchase_order_pdf_returns_pdf(self):
        self.client.force_authenticate(self.user)
        self.supplier.registered_address = "Supplier HQ, Warsaw"
        self.supplier.save(update_fields=["registered_address"])

        response = self.client.post(
            "/api/purchases/po/pdf/",
            {
                "order_date": "2026-03-20",
                "approximate_delivery_date": "2026-03-25",
                "supplier_name": "Existing Supplier",
                "is_shop_consumable": False,
                "lines": [
                    {
                        "part_name": "Brake Disc",
                        "quantity": "2",
                        "purchase_price": "89.99",
                        "unit_of_measure_id": self.uom_pcs.id,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn("po_existing_supplier_2026-03-20.pdf", response["Content-Disposition"])
        self.assertTrue(response.content.startswith(b"%PDF"))

    def test_purchase_order_pdf_requires_lines(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/purchases/po/pdf/",
            {
                "order_date": "2026-03-20",
                "supplier_name": "Existing Supplier",
                "lines": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_create_purchase_without_repair_or_vehicle(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            "/api/purchases/",
            self._purchase_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        purchase = Purchase.objects.get(id=response.json()["id"])
        self.assertEqual(purchase.repair_code, "")
        self.assertIsNone(purchase.vehicle)
        self.assertEqual(response.json()["repair_code"], "")
        self.assertIsNone(response.json()["vehicle"])
        self.assertFalse(response.json()["is_shop_consumable"])
        self.assertEqual(response.json()["unit_of_measure"]["code"], "pcs")

    def test_search_filters_by_part_name(self):
        self.client.force_authenticate(self.user)
        Purchase.objects.create(
            order_date="2026-03-20",
            part_name="Brake Pad",
            quantity=4,
            purchase_price="45.00",
            supplier=self.supplier,
            unit_of_measure=self.uom_pcs,
        )
        Purchase.objects.create(
            order_date="2026-03-21",
            part_name="Air Filter",
            quantity=1,
            purchase_price="12.00",
            supplier=self.supplier,
            unit_of_measure=self.uom_pcs,
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
            unit_of_measure=self.uom_pcs,
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
            unit_of_measure=self.uom_pcs,
        )

        response = self.client.patch(
            f"/api/purchases/{purchase.id}",
            {"part_name": "New Part"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["part_name"], "New Part")

    def test_update_purchase_delivered(self):
        self.client.force_authenticate(self.user)
        purchase = Purchase.objects.create(
            order_date="2026-03-20",
            part_name="Windshield",
            quantity=1,
            purchase_price="120.00",
            supplier=self.supplier,
            unit_of_measure=self.uom_pcs,
        )

        response = self.client.patch(
            f"/api/purchases/{purchase.id}",
            {"delivered": True},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["delivered"])
        purchase.refresh_from_db()
        self.assertTrue(purchase.delivered)

    def test_update_consumable_current_stock_quantity(self):
        self.client.force_authenticate(self.user)
        purchase = Purchase.objects.create(
            order_date="2026-03-20",
            part_name="Gloves",
            quantity=10,
            purchase_price="2.00",
            supplier=self.supplier,
            unit_of_measure=self.uom_pcs,
            is_shop_consumable=True,
        )

        response = self.client.patch(
            f"/api/purchases/{purchase.id}",
            {"current_stock_quantity": "4.50"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["current_stock_quantity"], "4.50")
        purchase.refresh_from_db()
        self.assertEqual(str(purchase.current_stock_quantity), "4.50")

    def test_delete_purchase(self):
        self.client.force_authenticate(self.user)
        purchase = Purchase.objects.create(
            order_date="2026-03-20",
            part_name="Disposable Part",
            quantity=1,
            purchase_price="5.00",
            supplier=self.supplier,
            unit_of_measure=self.uom_pcs,
        )

        response = self.client.delete(f"/api/purchases/{purchase.id}")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Purchase.objects.filter(id=purchase.id).exists())

    def test_filter_shop_consumable_param(self):
        self.client.force_authenticate(self.user)
        Purchase.objects.create(
            order_date="2026-03-20",
            part_name="Brake Disc",
            quantity=1,
            purchase_price="50.00",
            supplier=self.supplier,
            unit_of_measure=self.uom_pcs,
            is_shop_consumable=False,
        )
        Purchase.objects.create(
            order_date="2026-03-20",
            part_name="Gloves",
            quantity=10,
            purchase_price="2.00",
            supplier=self.supplier,
            unit_of_measure=self.uom_pcs,
            is_shop_consumable=True,
        )

        parts = self.client.get("/api/purchases/", {"shop_consumable": "false"})
        cons = self.client.get("/api/purchases/", {"shop_consumable": "true"})
        self.assertEqual(parts.status_code, 200)
        self.assertEqual(cons.status_code, 200)
        self.assertEqual(len(parts.json()["results"]), 1)
        self.assertEqual(len(cons.json()["results"]), 1)
        self.assertEqual(parts.json()["results"][0]["part_name"], "Brake Disc")
        self.assertEqual(cons.json()["results"][0]["part_name"], "Gloves")

    def test_list_units_of_measure(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/purchases/units/")
        self.assertEqual(response.status_code, 200)
        codes = {row["code"] for row in response.json()}
        self.assertIn("pcs", codes)
        self.assertIn("L", codes)

    def test_staff_cannot_create_unit_of_measure(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/purchases/units/",
            {"code": "box", "name": "Box", "is_active": True, "sort_order": 99},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_admin_can_create_and_list_inactive_units(self):
        admin = get_user_model().objects.create_user(
            email="admin-uom@test.local",
            password="admin12345",
            role="admin",
            is_staff=True,
        )
        UnitOfMeasure.objects.create(
            code="old-uom",
            name="Legacy",
            is_active=False,
            sort_order=999,
        )
        self.client.force_authenticate(self.user)
        staff_list = self.client.get("/api/purchases/units/")
        self.assertEqual(staff_list.status_code, 200)
        staff_codes = {row["code"] for row in staff_list.json()}
        self.assertNotIn("old-uom", staff_codes)

        self.client.force_authenticate(admin)
        admin_list = self.client.get("/api/purchases/units/", {"include_inactive": "true"})
        self.assertEqual(admin_list.status_code, 200)
        admin_codes = {row["code"] for row in admin_list.json()}
        self.assertIn("old-uom", admin_codes)

        response = self.client.post(
            "/api/purchases/units/",
            {"code": "srv", "name": "Service unit", "is_active": True, "sort_order": 15},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["code"], "srv")

    def test_staff_cannot_patch_unit_of_measure(self):
        self.client.force_authenticate(self.user)
        u = UnitOfMeasure.objects.get(code="L")
        response = self.client.patch(f"/api/purchases/units/{u.id}", {"name": "Litres"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_admin_cannot_delete_unit_referenced_by_purchase(self):
        admin = get_user_model().objects.create_user(
            email="admin-del@test.local",
            password="admin12345",
            role="admin",
            is_staff=True,
        )
        u = UnitOfMeasure.objects.create(code="del-uom", name="To delete", is_active=True, sort_order=900)
        Purchase.objects.create(
            order_date="2026-03-20",
            part_name="Part",
            quantity=1,
            purchase_price="10.00",
            supplier=self.supplier,
            unit_of_measure=u,
        )
        self.client.force_authenticate(admin)
        response = self.client.delete(f"/api/purchases/units/{u.id}")
        self.assertEqual(response.status_code, 400)
        self.assertTrue(UnitOfMeasure.objects.filter(id=u.id).exists())

    def test_admin_can_reorder_units(self):
        admin = get_user_model().objects.create_user(
            email="admin-reorder@test.local",
            password="admin12345",
            role="admin",
            is_staff=True,
        )
        self.client.force_authenticate(admin)
        listed = self.client.get("/api/purchases/units/", {"include_inactive": "true"})
        self.assertEqual(listed.status_code, 200)
        ids = [row["id"] for row in listed.json()]
        rev = list(reversed(ids))
        resp = self.client.post("/api/purchases/units/reorder/", {"order": rev}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual([row["id"] for row in resp.json()], rev)
        again = self.client.get("/api/purchases/units/", {"include_inactive": "true"})
        self.assertEqual([row["id"] for row in again.json()], rev)

    def test_staff_cannot_reorder_units(self):
        self.client.force_authenticate(self.user)
        listed = self.client.get("/api/purchases/units/")
        ids = [row["id"] for row in listed.json()]
        resp = self.client.post("/api/purchases/units/reorder/", {"order": list(reversed(ids))}, format="json")
        self.assertEqual(resp.status_code, 403)

    def test_reorder_units_requires_full_id_set(self):
        admin = get_user_model().objects.create_user(
            email="admin-reorder2@test.local",
            password="admin12345",
            role="admin",
            is_staff=True,
        )
        self.client.force_authenticate(admin)
        listed = self.client.get("/api/purchases/units/", {"include_inactive": "true"})
        ids = [row["id"] for row in listed.json()]
        resp = self.client.post("/api/purchases/units/reorder/", {"order": ids[:-1]}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_admin_create_unit_without_sort_order_appends(self):
        admin = get_user_model().objects.create_user(
            email="admin-append@test.local",
            password="admin12345",
            role="admin",
            is_staff=True,
        )
        self.client.force_authenticate(admin)
        resp = self.client.post(
            "/api/purchases/units/",
            {"code": "no-sort", "name": "No sort sent", "is_active": True},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertIn("sort_order", resp.json())
