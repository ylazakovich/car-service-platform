import json
from pathlib import Path
from tempfile import TemporaryDirectory

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase

from customers.models import Customer
from purchases.models import Purchase, Supplier, UnitOfMeasure
from repairs.datafaker_demo import parse_decimal, parse_demo_payload, with_marker
from repairs.models import Repair, RepairDocument, RepairFinancialSnapshot
from services.models import Service
from vehicles.models import Vehicle


class DatafakerDemoPayloadTests(SimpleTestCase):
    def _payload(self):
        return {
            "metadata": {
                "generator": "datafaker",
                "schema_version": 1,
                "seed": 123,
                "profile": "small",
                "locale": "en-US",
                "marker": "datafaker-demo:small:123",
            },
            "users": [
                {
                    "email": "staff@autoservice.local",
                    "first_name": "Demo",
                    "last_name": "Staff",
                    "role": "staff",
                    "is_staff": False,
                }
            ],
            "services": [
                {
                    "key": "oil-service",
                    "name": "Oil service",
                    "price": "140.00",
                    "is_active": True,
                }
            ],
            "suppliers": [
                {"key": "supplier-1", "name": "Parts Supplier"},
            ],
            "customers": [
                {
                    "key": "customer-001",
                    "full_name": "Jan Kowalski",
                    "phone": "+48 500 100 200",
                }
            ],
            "vehicles": [
                {
                    "key": "vehicle-001",
                    "customer_key": "customer-001",
                    "license_plate": "DF 12345",
                    "make": "Toyota",
                    "model": "Corolla",
                }
            ],
            "repairs": [
                {
                    "key": "repair-001",
                    "tracking_code": "DFR-001",
                    "vehicle_key": "vehicle-001",
                    "master_email": "staff@autoservice.local",
                    "service_name": "Oil service",
                    "service_line_keys": ["oil-service"],
                    "status": "completed",
                }
            ],
            "purchases": [
                {
                    "key": "purchase-001-1",
                    "supplier_key": "supplier-1",
                    "vehicle_key": "vehicle-001",
                    "repair_key": "repair-001",
                    "part_name": "Oil filter",
                    "quantity": "1",
                    "purchase_price": "25.50",
                    "sale_price": "39.90",
                    "order_date": "2026-04-10",
                }
            ],
        }

    def test_parse_payload_accepts_connected_datafaker_scenario(self):
        payload = parse_demo_payload(self._payload())

        self.assertEqual(payload.marker, "datafaker-demo:small:123")
        self.assertEqual(payload.customers[0]["key"], "customer-001")
        self.assertEqual(payload.repairs[0]["service_line_keys"], ["oil-service"])

    def test_parse_payload_rejects_unknown_vehicle_reference(self):
        raw = self._payload()
        raw["repairs"][0]["vehicle_key"] = "missing-vehicle"

        with self.assertRaisesMessage(CommandError, "references unknown vehicle_key"):
            parse_demo_payload(raw)

    def test_parse_payload_rejects_unknown_service_line_reference(self):
        raw = self._payload()
        raw["repairs"][0]["service_line_keys"] = ["missing-service"]

        with self.assertRaisesMessage(CommandError, "references unknown service key"):
            parse_demo_payload(raw)

    def test_parse_payload_rejects_invalid_money(self):
        raw = self._payload()
        raw["purchases"][0]["purchase_price"] = "not-money"

        with self.assertRaisesMessage(CommandError, "purchase_price must be a decimal"):
            parse_demo_payload(raw)

    def test_parse_decimal_quantizes_to_money_scale(self):
        self.assertEqual(parse_decimal("12.345", field="purchase_price"), parse_decimal("12.35", field="purchase_price"))

    def test_with_marker_is_idempotent(self):
        self.assertEqual(with_marker("note", "datafaker-demo:small:123"), "note [datafaker-demo:small:123]")
        self.assertEqual(
            with_marker("note [datafaker-demo:small:123]", "datafaker-demo:small:123"),
            "note [datafaker-demo:small:123]",
        )


class ImportDatafakerDemoCommandTests(TestCase):
    def _payload(self):
        return DatafakerDemoPayloadTests()._payload()

    def _write_payload(self, payload):
        tmpdir = TemporaryDirectory()
        path = Path(tmpdir.name) / "datafaker-demo.json"
        path.write_text(json.dumps(payload), encoding="utf-8")
        self.addCleanup(tmpdir.cleanup)
        return path

    def test_import_upserts_admin_and_staff_users(self):
        payload = self._payload()
        payload["users"].insert(
            0,
            {
                "email": "admin@autoservice.local",
                "first_name": "Demo",
                "last_name": "Admin",
                "role": "admin",
                "is_staff": True,
                "password": "admin12345",
            },
        )
        path = self._write_payload(payload)

        call_command("import_datafaker_demo", str(path), replace=True)

        User = get_user_model()
        admin = User.objects.get(email="admin@autoservice.local")
        staff = User.objects.get(email="staff@autoservice.local")
        self.assertEqual(admin.role, "admin")
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.check_password("admin12345"))
        self.assertEqual(staff.role, "staff")

    def test_import_assigns_generated_customers_to_staff_user(self):
        path = self._write_payload(self._payload())

        call_command("import_datafaker_demo", str(path), replace=True)

        customer = Customer.objects.get(phone="+48 500 100 200")
        self.assertEqual(customer.assigned_to.email, "staff@autoservice.local")

    def test_import_prepares_acts_for_completed_and_picked_up_repairs(self):
        payload = self._payload()
        payload["repairs"][0]["completed_at"] = "2026-04-15"
        payload["repairs"].append(
            {
                "key": "repair-002",
                "tracking_code": "DFR-002",
                "vehicle_key": "vehicle-001",
                "master_email": "staff@autoservice.local",
                "service_name": "Oil service",
                "service_line_keys": ["oil-service"],
                "status": "picked_up",
                "mileage_at_service": 123456,
                "completed_at": "2026-04-16",
            }
        )
        payload["purchases"].append(
            {
                "key": "purchase-002-1",
                "supplier_key": "supplier-1",
                "vehicle_key": "vehicle-001",
                "repair_key": "repair-002",
                "part_name": "Air filter",
                "quantity": "2",
                "purchase_price": "30.00",
                "sale_price": "45.00",
                "order_date": "2026-04-11",
            }
        )
        path = self._write_payload(payload)

        call_command("import_datafaker_demo", str(path), replace=True)

        eligible_repairs = Repair.objects.filter(status__in=[Repair.Status.COMPLETED, Repair.Status.PICKED_UP])
        self.assertEqual(eligible_repairs.count(), 2)
        self.assertEqual(RepairDocument.objects.filter(repair__in=eligible_repairs).count(), 2)
        self.assertEqual(RepairFinancialSnapshot.objects.filter(repair__in=eligible_repairs).count(), 2)
        for repair in eligible_repairs:
            document = RepairDocument.objects.get(repair=repair)
            self.assertEqual(document.version, 1)
            self.assertEqual(document.exported_by.email, "staff@autoservice.local")
            self.assertEqual(document.original_filename, f"act_{repair.tracking_code}.pdf")
            snapshot = RepairFinancialSnapshot.objects.get(repair=repair)
            self.assertEqual(snapshot.document, document)
            self.assertGreater(snapshot.document_total, 0)

    def test_replace_legacy_sql_demo_removes_old_fixture_rows_before_import(self):
        User = get_user_model()
        legacy_staff = User.objects.create_user(email="legacy@autoservice.local", password="x", role="staff")
        legacy_customer = Customer.objects.create(
            full_name="Oleksandr Kovalenko",
            phone="+380****4567",
            assigned_to=legacy_staff,
        )
        legacy_vehicle = Vehicle.objects.create(
            customer=legacy_customer,
            license_plate="AA 1234 BB",
            make="Toyota",
            model="Camry",
        )
        legacy_repair = Repair.objects.create(vehicle=legacy_vehicle, service_name="Oil change", tracking_code="TOR-1001")
        unit, _ = UnitOfMeasure.objects.get_or_create(code="pcs", defaults={"name": "Pieces"})
        supplier = Supplier.objects.create(name="Legacy Supplier")
        Purchase.objects.create(
            order_date="2026-04-10",
            supplier=supplier,
            vehicle=legacy_vehicle,
            unit_of_measure=unit,
            part_name="Legacy oil filter",
            quantity="1.00",
            purchase_price="25.50",
            sale_price="39.90",
            repair_code=legacy_repair.tracking_code,
        )
        path = self._write_payload(self._payload())

        call_command("import_datafaker_demo", str(path), replace=True, replace_legacy_sql_demo=True)

        self.assertFalse(Customer.objects.filter(phone="+380****4567").exists())
        self.assertFalse(Vehicle.objects.filter(license_plate="AA 1234 BB").exists())
        self.assertFalse(Repair.objects.filter(tracking_code="TOR-1001").exists())
        self.assertFalse(Purchase.objects.filter(part_name="Legacy oil filter").exists())
        self.assertTrue(Repair.objects.filter(tracking_code="DFR-001").exists())
        self.assertTrue(Customer.objects.filter(phone="+48 500 100 200").exists())
