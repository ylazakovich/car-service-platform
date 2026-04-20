import base64
import shutil
import unittest

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from customers.models import Customer
from vehicles.models import Vehicle

from .invoice_line_parse import extract_text_from_file
from .models import InvoiceLineParseTemplate, Purchase, Supplier, SupplierAlias, UnitOfMeasure


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

    def test_create_supplier_alias(self):
        self.client.force_authenticate(self.user)
        supplier = Supplier.objects.create(name="Canonical Vendor", nip="")
        response = self.client.post(
            f"/api/purchases/suppliers/{supplier.id}/aliases/",
            {"alias_text": "  OCR Vendor Name  "},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["alias_text"], "OCR Vendor Name")
        self.assertEqual(data["normalized_key"], "ocr vendor name")
        alias = SupplierAlias.objects.get(pk=data["id"])
        self.assertEqual(alias.supplier_id, supplier.id)

    def test_duplicate_supplier_alias_returns_400(self):
        self.client.force_authenticate(self.user)
        supplier = Supplier.objects.create(name="Vendor A", nip="")
        Supplier.objects.create(name="Vendor B", nip="")
        SupplierAlias.objects.create(supplier=supplier, alias_text="shared token")
        other = Supplier.objects.get(name="Vendor B")
        response = self.client.post(
            f"/api/purchases/suppliers/{other.id}/aliases/",
            {"alias_text": "SHARED   token"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)


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

    def test_bulk_create_sets_nip_on_new_supplier(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/purchases/bulk/",
            {
                "order_date": "2026-04-03",
                "supplier_name": "Fresh Vendor With Nip",
                "supplier_nip": "5251112233",
                "is_shop_consumable": True,
                "lines": [{"part_name": "Oil", "quantity": 1, "purchase_price": "20.00"}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        vendor = Supplier.objects.get(name="Fresh Vendor With Nip")
        self.assertEqual(vendor.nip, "5251112233")

    def test_bulk_create_does_not_overwrite_existing_supplier_nip(self):
        self.client.force_authenticate(self.user)
        Supplier.objects.create(name="Locked Nip Vendor", nip="1111111111")
        response = self.client.post(
            "/api/purchases/bulk/",
            {
                "order_date": "2026-04-04",
                "supplier_name": "Locked Nip Vendor",
                "supplier_nip": "9999999999",
                "is_shop_consumable": True,
                "lines": [{"part_name": "Oil", "quantity": 1, "purchase_price": "10.00"}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        vendor = Supplier.objects.get(name="Locked Nip Vendor")
        self.assertEqual(vendor.nip, "1111111111")

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


class InvoiceParseApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = get_user_model().objects.create_user(
            email="staff-invoice-parse@test.local",
            password="staff12345",
            role="staff",
        )
        self.admin = get_user_model().objects.create_user(
            email="admin-invoice-parse@test.local",
            password="admin12345",
            role="admin",
            is_staff=True,
        )

    def test_preview_parses_demo_pipe_line_with_template(self):
        template = InvoiceLineParseTemplate.objects.filter(name="Pipe table (demo PL)").first()
        self.assertIsNotNone(template)
        self.client.force_authenticate(self.staff)
        raw = (
            "  1  | Filtr oleju Bosch OF-512 (demo)                   |   2   | szt |    42,50   |      85,00    |  23%"
        )
        response = self.client.post(
            "/api/purchases/invoice-parse/preview/",
            {"raw_text": raw, "template_id": template.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["matched_count"], 1)
        self.assertEqual(body["lines"][0]["part_name"], "Filtr oleju Bosch OF-512 (demo)")
        self.assertEqual(body["lines"][0]["quantity"], 2)
        self.assertEqual(body["lines"][0]["purchase_price"], "85.00")
        self.assertEqual(body["lines"][0].get("uom_raw"), "szt")
        self.assertIn("supplier_resolution", body)
        self.assertEqual(body["supplier_resolution"].get("match"), "none")
        uom_res = body["lines"][0].get("uom_resolution") or {}
        self.assertEqual(uom_res.get("match"), "synonym")
        self.assertIsNotNone(body["lines"][0].get("unit_of_measure_id"))

    def test_preview_resolves_supplier_exact_and_warns_on_unknown_uom(self):
        template = InvoiceLineParseTemplate.objects.filter(name="Pipe table (demo PL)").first()
        self.assertIsNotNone(template)
        Supplier.objects.create(name="ACME Parts Demo", nip="")
        self.client.force_authenticate(self.staff)
        raw = (
            "Sprzedawca (Seller): ACME Parts Demo\n"
            "  1  | Filtr |   2   | xxxunk |    10,00   |      20,00    |  23%"
        )
        sup_pat = r"(?is)Sprzedawca\s*\([^)]*\)\s*:\s*(?P<supplier_name>[^\r\n]+)"
        response = self.client.post(
            "/api/purchases/invoice-parse/preview/",
            {"raw_text": raw, "template_id": template.pk, "supplier_pattern": sup_pat},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["supplier_resolution"]["match"], "exact")
        self.assertEqual(body["supplier_resolution"]["resolved_name"], "ACME Parts Demo")
        self.assertEqual(body["supplier_resolution"]["supplier_id"], Supplier.objects.get(name="ACME Parts Demo").id)
        self.assertEqual(body["lines"][0]["uom_resolution"]["match"], "none")
        self.assertTrue(any("not mapped" in w for w in body["warnings"]))

    def test_preview_resolves_supplier_via_alias(self):
        template = InvoiceLineParseTemplate.objects.filter(name="Pipe table (demo PL)").first()
        self.assertIsNotNone(template)
        canonical = Supplier.objects.create(name="Canonical Sp z o.o.", nip="")
        SupplierAlias.objects.create(supplier=canonical, alias_text="hurt acme sp. z o.o.")
        self.client.force_authenticate(self.staff)
        raw = (
            "Sprzedawca (Seller): hurt acme sp. z o.o.\n"
            "  1  | Filtr |   2   | szt |    10,00   |      20,00    |  23%"
        )
        sup_pat = r"(?is)Sprzedawca\s*\([^)]*\)\s*:\s*(?P<supplier_name>[^\r\n]+)"
        response = self.client.post(
            "/api/purchases/invoice-parse/preview/",
            {"raw_text": raw, "template_id": template.pk, "supplier_pattern": sup_pat},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["supplier_resolution"]["match"], "alias")
        self.assertEqual(body["supplier_resolution"]["resolved_name"], "Canonical Sp z o.o.")
        self.assertEqual(body["supplier_resolution"]["supplier_id"], canonical.id)

    def test_suggest_returns_pattern_for_multi_line_demo(self):
        self.client.force_authenticate(self.staff)
        raw = (
            "  1  | Part A |   1   | szt | 10,00 | 10,00\n"
            "  2  | Part B |   2   | szt | 5,00 | 10,00\n"
        )
        response = self.client.post("/api/purchases/invoice-parse/suggest/", {"raw_text": raw}, format="json")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("matched"))
        self.assertIn("line_pattern", data)
        self.assertIn("supplier_resolution", data)
        pl0 = data["preview_lines"][0]
        self.assertEqual(pl0.get("uom_raw"), "szt")
        self.assertIsNotNone(pl0.get("unit_of_measure_id"))

    def test_suggest_accepts_plain_text_file_multipart(self):
        self.client.force_authenticate(self.staff)
        raw = (
            "  1  | Part A |   1   | szt | 10,00 | 10,00\n"
            "  2  | Part B |   2   | szt | 5,00 | 10,00\n"
        )
        upload = SimpleUploadedFile("demo.txt", raw.encode("utf-8"), content_type="text/plain")
        response = self.client.post("/api/purchases/invoice-parse/suggest/", {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("matched"))
        self.assertIn("line_pattern", data)

    def test_extract_returns_text_from_plain_file(self):
        self.client.force_authenticate(self.staff)
        raw = "Sprzedawca: ACME\nLine one\n"
        upload = SimpleUploadedFile("x.txt", raw.encode("utf-8"), content_type="text/plain")
        response = self.client.post("/api/purchases/invoice-parse/extract/", {"file": upload}, format="multipart")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json().get("raw_text"), raw.strip())

    def test_staff_cannot_create_template(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            "/api/purchases/invoice-parse-templates/",
            {
                "name": "X",
                "description": "",
                "line_pattern": r"(?P<part_name>.+)\s(?P<quantity>\d+)\s(?P<purchase_price>[\d.]+)",
                "is_active": True,
                "sort_order": 99,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_admin_create_template_requires_named_groups(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/purchases/invoice-parse-templates/",
            {
                "name": "Bad",
                "description": "",
                "line_pattern": r"(?P<x>.*)",
                "is_active": True,
                "sort_order": 5,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("line_pattern", response.json())

    def test_staff_lists_active_templates(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get("/api/purchases/invoice-parse-templates/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)


@unittest.skipUnless(shutil.which("tesseract"), "tesseract not installed")
class InvoiceOcrExtractTests(TestCase):
    """Requires Tesseract + language packs on PATH (Docker image and CI install them)."""

    def test_extract_text_from_minimal_png_does_not_crash(self):
        png = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        )
        upload = SimpleUploadedFile("tiny.png", png, content_type="image/png")
        text = extract_text_from_file(upload)
        self.assertIsInstance(text, str)
