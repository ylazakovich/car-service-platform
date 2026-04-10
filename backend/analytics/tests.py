import tempfile
from datetime import date, datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from customers.models import Customer
from purchases.models import Purchase, Supplier, UnitOfMeasure
from repairs.models import Repair, RepairDocument, RepairFinancialSnapshot
from services.models import Service
from vehicles.models import Vehicle


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class StaffDashboardAnalyticsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            email="staff@test.local",
            password="staff12345",
            role="staff",
        )
        self.customer = Customer.objects.create(
            full_name="Anna Nowak",
            phone="+48 600 200 300",
            assigned_to=self.user,
        )
        self.vehicle = Vehicle.objects.create(
            customer=self.customer,
            license_plate="WA 99999",
            make="Toyota",
            model="Yaris",
        )
        self.uom_pcs = UnitOfMeasure.objects.get(code="pcs")

    def _completed_repair(self, completed_on: date):
        r = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Oil Change",
            status="new",
        )
        r.status = Repair.Status.COMPLETED
        r.completed_at = completed_on
        r.save()
        return r

    def _attach_snapshot(self, repair: Repair, version: int, totals: tuple[Decimal, Decimal, Decimal, Decimal, Decimal]):
        labor, parts_c, parts_p, other, doc_total = totals
        doc = RepairDocument.objects.create(
            repair=repair,
            version=version,
            original_filename=f"act_{repair.tracking_code}.pdf",
            exported_by=self.user,
        )
        doc.file.save(f"v{version}.pdf", ContentFile(b"%PDF-1.4 minimal"), save=True)
        RepairFinancialSnapshot.objects.create(
            repair=repair,
            document=doc,
            labor_total=labor,
            parts_client_total=parts_c,
            parts_purchase_total=parts_p,
            other_expenses_total=other,
            document_total=doc_total,
        )
        return doc

    def _create_repair(
        self,
        *,
        vehicle: Vehicle | None = None,
        service_name: str = "Oil Change",
        status: str = Repair.Status.NEW,
        created_at: datetime | None = None,
        completed_at: date | None = None,
        master=None,
    ) -> Repair:
        repair = Repair.objects.create(
            vehicle=vehicle or self.vehicle,
            service_name=service_name,
            status=status,
            master=master,
            created_at=created_at or timezone.make_aware(datetime(2026, 1, 1, 10, 0, 0)),
        )
        if status == Repair.Status.COMPLETED:
            repair.completed_at = completed_at
            repair.save()
        return repair

    def test_requires_auth(self):
        response = self.client.get("/api/analytics/dashboard/?start_date=2026-01-01&end_date=2026-01-31")
        self.assertEqual(response.status_code, 403)

    def test_rejects_bad_range(self):
        self.client.force_authenticate(self.user)
        r = self.client.get("/api/analytics/dashboard/?start_date=2026-02-01&end_date=2026-01-01")
        self.assertEqual(r.status_code, 400)

    def test_latest_act_totals_use_max_version_only(self):
        repair = self._completed_repair(date(2026, 1, 15))
        self._attach_snapshot(
            repair,
            1,
            (
                Decimal("100"),
                Decimal("50"),
                Decimal("30"),
                Decimal("0"),
                Decimal("150"),
            ),
        )
        self._attach_snapshot(
            repair,
            2,
            (
                Decimal("200"),
                Decimal("80"),
                Decimal("40"),
                Decimal("10"),
                Decimal("330"),
            ),
        )

        self.client.force_authenticate(self.user)
        response = self.client.get("/api/analytics/dashboard/?start_date=2026-01-01&end_date=2026-01-31")
        self.assertEqual(response.status_code, 200)
        pdf = response.json()["pdf"]
        self.assertEqual(pdf["latest_act_totals"]["document_total"], 330.0)
        self.assertEqual(pdf["latest_act_totals"]["repairs_with_latest_act"], 1)
        self.assertEqual(pdf["coverage"]["completed_in_range"], 1)
        self.assertEqual(pdf["coverage"]["completed_without_pdf"], 0)

    def test_completed_without_pdf_in_coverage(self):
        self._completed_repair(date(2026, 1, 10))

        self.client.force_authenticate(self.user)
        response = self.client.get("/api/analytics/dashboard/?start_date=2026-01-01&end_date=2026-01-31")
        self.assertEqual(response.status_code, 200)
        pdf = response.json()["pdf"]
        self.assertEqual(pdf["coverage"]["completed_without_pdf"], 1)
        self.assertEqual(pdf["latest_act_totals"]["document_total"], 0.0)

    def test_operational_funnel_uses_created_range(self):
        Repair.objects.create(vehicle=self.vehicle, service_name="A", status="new")
        r2 = Repair.objects.create(vehicle=self.vehicle, service_name="B", status="new")
        r2.status = Repair.Status.IN_PROGRESS
        r2.save()

        self.client.force_authenticate(self.user)
        response = self.client.get(
            "/api/analytics/dashboard/?start_date=2026-01-01&end_date=2026-01-31"
            "&operational_start_date=2026-03-01&operational_end_date=2026-03-31"
        )
        self.assertEqual(response.status_code, 200)
        op = response.json()["operational"]
        self.assertEqual(op["repairs_created_in_range"], 0)

        today = date.today()
        Repair.objects.create(vehicle=self.vehicle, service_name="C", status="waiting_parts")
        r = self.client.get(
            f"/api/analytics/dashboard/?start_date=2026-01-01&end_date=2026-12-31"
            f"&operational_start_date={today.isoformat()}&operational_end_date={today.isoformat()}"
        )
        self.assertEqual(r.status_code, 200)
        funnel = r.json()["operational"]["funnel_by_status"]
        self.assertGreaterEqual(funnel.get("waiting_parts", 0), 1)

    def test_moneyflow_suppliers_unlinked_and_exporters(self):
        sup = Supplier.objects.create(name="PartsCo")
        Purchase.objects.create(
            order_date=date(2026, 1, 5),
            supplier=sup,
            part_name="Filter",
            quantity=2,
            purchase_price=Decimal("10.00"),
            sale_price=Decimal("25.00"),
            repair_code="",
            unit_of_measure=self.uom_pcs,
        )
        Purchase.objects.create(
            order_date=date(2026, 1, 6),
            supplier=sup,
            part_name="Bolt",
            quantity=1,
            purchase_price=Decimal("5.00"),
            sale_price=Decimal("12.00"),
            repair_code="ABC",
            unit_of_measure=self.uom_pcs,
        )
        Purchase.objects.create(
            order_date=date(2026, 1, 7),
            supplier=sup,
            part_name="Shop gloves",
            quantity=1,
            purchase_price=Decimal("100.00"),
            sale_price=Decimal("0.00"),
            repair_code="",
            unit_of_measure=self.uom_pcs,
            is_shop_consumable=True,
        )

        repair = self._completed_repair(date(2026, 1, 10))
        doc = self._attach_snapshot(
            repair,
            1,
            (
                Decimal("50"),
                Decimal("20"),
                Decimal("10"),
                Decimal("0"),
                Decimal("80"),
            ),
        )
        RepairDocument.objects.filter(pk=doc.pk).update(
            created_at=timezone.make_aware(datetime(2026, 1, 12, 10, 0, 0))
        )

        self.client.force_authenticate(self.user)
        response = self.client.get("/api/analytics/dashboard/?start_date=2026-01-01&end_date=2026-01-31")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("moneyflow", body)
        mf = body["moneyflow"]
        self.assertEqual(len(mf["supplier_spend_top"]), 1)
        self.assertEqual(mf["supplier_spend_top"][0]["supplier_name"], "PartsCo")
        self.assertEqual(mf["supplier_spend_top"][0]["total_spend"], 25.0)
        self.assertEqual(mf["purchases_unlinked"]["count"], 1)
        self.assertEqual(mf["purchases_unlinked"]["total_spend"], 20.0)
        self.assertEqual(mf["shop_consumables"]["line_count"], 1)
        self.assertEqual(mf["shop_consumables"]["buy_total"], 100.0)
        self.assertEqual(len(mf["exports_by_exporter"]), 1)
        self.assertEqual(mf["exports_by_exporter"][0]["user_id"], self.user.id)
        self.assertEqual(mf["exports_by_exporter"][0]["export_count"], 1)

    def test_warehouse_live_stock_payload(self):
        sup_a = Supplier.objects.create(name="PartsCo")
        sup_b = Supplier.objects.create(name="TransitOnly")

        Purchase.objects.create(
            order_date=date(2026, 1, 5),
            supplier=sup_a,
            part_name="Filter",
            quantity=2,
            purchase_price=Decimal("10.00"),
            sale_price=Decimal("15.00"),
            repair_code="TOR-1001",
            invoice_name="invoice-filter.pdf",
            delivered=True,
            unit_of_measure=self.uom_pcs,
        )
        Purchase.objects.create(
            order_date=date(2026, 1, 6),
            supplier=sup_a,
            part_name="Bolt",
            quantity=3,
            purchase_price=Decimal("5.00"),
            sale_price=Decimal("9.00"),
            repair_code="",
            invoice_url="https://files.test/invoice-bolt.pdf",
            delivered=True,
            unit_of_measure=self.uom_pcs,
        )
        Purchase.objects.create(
            order_date=date(2026, 1, 7),
            supplier=sup_b,
            part_name="Turbo",
            quantity=4,
            purchase_price=Decimal("20.00"),
            sale_price=Decimal("30.00"),
            repair_code="",
            delivered=False,
            unit_of_measure=self.uom_pcs,
        )
        Purchase.objects.create(
            order_date=date(2026, 2, 1),
            supplier=sup_b,
            part_name="Late order",
            quantity=1,
            purchase_price=Decimal("100.00"),
            sale_price=Decimal("140.00"),
            repair_code="TOR-2000",
            delivered=False,
            unit_of_measure=self.uom_pcs,
        )

        self.client.force_authenticate(self.user)
        response = self.client.get("/api/analytics/dashboard/?start_date=2026-01-01&end_date=2026-01-31")
        self.assertEqual(response.status_code, 200)

        warehouse = response.json()["warehouse"]
        self.assertTrue(warehouse["snapshot_as_of"])

        stock_totals = warehouse["stock_totals"]
        self.assertEqual(stock_totals["delivered_quantity_total"], 5)
        self.assertEqual(stock_totals["assigned_quantity_total"], 2)
        self.assertEqual(stock_totals["free_quantity_total"], 3)
        self.assertEqual(stock_totals["in_transit_quantity_total"], 5)

        valuations = warehouse["valuations"]
        self.assertEqual(valuations["in_stock"]["buy_total"], 35.0)
        self.assertEqual(valuations["in_stock"]["sale_total"], 57.0)
        self.assertEqual(valuations["in_stock"]["margin_total"], 22.0)
        self.assertEqual(valuations["in_transit"]["buy_total"], 180.0)
        self.assertEqual(valuations["in_transit"]["sale_total"], 260.0)
        self.assertEqual(valuations["in_transit"]["margin_total"], 80.0)
        self.assertEqual(valuations["cumulative"]["buy_total"], 215.0)
        self.assertEqual(valuations["cumulative"]["sale_total"], 317.0)
        self.assertEqual(valuations["cumulative"]["margin_total"], 102.0)

        invoice_split = warehouse["invoice_split"]
        self.assertEqual(invoice_split["with_invoice"]["line_count"], 2)
        self.assertEqual(invoice_split["with_invoice"]["quantity_total"], 5)
        self.assertEqual(invoice_split["with_invoice"]["buy_total"], 35.0)
        self.assertEqual(invoice_split["without_invoice"]["line_count"], 2)
        self.assertEqual(invoice_split["without_invoice"]["quantity_total"], 5)
        self.assertEqual(invoice_split["without_invoice"]["buy_total"], 180.0)

        suppliers = warehouse["suppliers_top_current"]
        self.assertEqual(len(suppliers), 2)
        self.assertEqual(suppliers[0]["supplier_name"], "TransitOnly")
        self.assertEqual(suppliers[0]["current_buy_total"], 180.0)
        self.assertEqual(suppliers[0]["in_stock_buy_total"], 0.0)
        self.assertEqual(suppliers[0]["in_transit_buy_total"], 180.0)
        self.assertEqual(suppliers[0]["current_quantity_total"], 5)
        self.assertEqual(suppliers[0]["in_stock_quantity_total"], 0)
        self.assertEqual(suppliers[0]["in_transit_quantity_total"], 5)
        self.assertEqual(len(suppliers[0]["parts"]), 2)
        self.assertEqual(suppliers[0]["parts"][0]["part_name"], "Late order")
        self.assertEqual(suppliers[0]["parts"][0]["current_buy_total"], 100.0)
        self.assertEqual(suppliers[0]["parts"][0]["in_stock_buy_total"], 0.0)
        self.assertEqual(suppliers[0]["parts"][0]["in_transit_buy_total"], 100.0)
        self.assertEqual(suppliers[0]["parts"][0]["current_quantity_total"], 1)
        self.assertEqual(suppliers[0]["parts"][1]["part_name"], "Turbo")
        self.assertEqual(suppliers[0]["parts"][1]["current_buy_total"], 80.0)
        self.assertEqual(suppliers[0]["parts"][1]["in_stock_buy_total"], 0.0)
        self.assertEqual(suppliers[0]["parts"][1]["in_transit_buy_total"], 80.0)
        self.assertEqual(suppliers[0]["parts"][1]["current_quantity_total"], 4)
        self.assertEqual(suppliers[1]["supplier_name"], "PartsCo")
        self.assertEqual(suppliers[1]["current_buy_total"], 35.0)
        self.assertEqual(suppliers[1]["in_stock_buy_total"], 35.0)
        self.assertEqual(suppliers[1]["in_transit_buy_total"], 0.0)
        self.assertEqual(suppliers[1]["current_quantity_total"], 5)
        self.assertEqual(suppliers[1]["in_stock_quantity_total"], 5)
        self.assertEqual(suppliers[1]["in_transit_quantity_total"], 0)
        self.assertEqual(len(suppliers[1]["parts"]), 2)
        self.assertEqual(suppliers[1]["parts"][0]["part_name"], "Filter")
        self.assertEqual(suppliers[1]["parts"][0]["current_buy_total"], 20.0)
        self.assertEqual(suppliers[1]["parts"][0]["in_stock_buy_total"], 20.0)
        self.assertEqual(suppliers[1]["parts"][0]["in_transit_buy_total"], 0.0)
        self.assertEqual(suppliers[1]["parts"][0]["current_quantity_total"], 2)
        self.assertEqual(suppliers[1]["parts"][1]["part_name"], "Bolt")
        self.assertEqual(suppliers[1]["parts"][1]["current_buy_total"], 15.0)
        self.assertEqual(suppliers[1]["parts"][1]["in_stock_buy_total"], 15.0)
        self.assertEqual(suppliers[1]["parts"][1]["in_transit_buy_total"], 0.0)
        self.assertEqual(suppliers[1]["parts"][1]["current_quantity_total"], 3)

    def test_service_board_payload_includes_range_current_all_time_and_master_metrics(self):
        staff_user_model = get_user_model()
        master_a = staff_user_model.objects.create_user(
            email="master-a@test.local",
            password="master12345",
            role="staff",
            first_name="Chris",
            last_name="North",
        )
        master_b = staff_user_model.objects.create_user(
            email="master-b@test.local",
            password="master12345",
            role="staff",
            first_name="Daria",
            last_name="West",
        )
        second_customer = Customer.objects.create(
            full_name="Piotr Kowalski",
            phone="+48 600 300 400",
            assigned_to=self.user,
        )
        second_vehicle = Vehicle.objects.create(
            customer=second_customer,
            license_plate="KR 12345",
            make="Ford",
            model="Focus",
        )
        Service.objects.create(name="Oil Change", price=Decimal("150.00"))
        Service.objects.create(name="Brake Service", price=Decimal("400.00"))

        open_repair = self._create_repair(
            service_name="Brake Service",
            status=Repair.Status.IN_PROGRESS,
            created_at=timezone.make_aware(datetime(2026, 1, 10, 10, 0, 0)),
            master=master_a,
        )
        waiting_repair = self._create_repair(
            service_name="Oil Change",
            status=Repair.Status.WAITING_PARTS,
            created_at=timezone.make_aware(datetime(2026, 1, 11, 10, 0, 0)),
            master=master_b,
        )
        completed_a = self._create_repair(
            service_name="Oil Change",
            status=Repair.Status.COMPLETED,
            created_at=timezone.make_aware(datetime(2026, 1, 5, 10, 0, 0)),
            completed_at=date(2026, 1, 15),
            master=master_a,
        )
        completed_b = self._create_repair(
            vehicle=second_vehicle,
            service_name="Brake Service",
            status=Repair.Status.COMPLETED,
            created_at=timezone.make_aware(datetime(2026, 1, 6, 10, 0, 0)),
            completed_at=date(2026, 1, 20),
            master=master_b,
        )
        historical_completed = self._create_repair(
            service_name="Oil Change",
            status=Repair.Status.COMPLETED,
            created_at=timezone.make_aware(datetime(2025, 12, 25, 10, 0, 0)),
            completed_at=date(2025, 12, 31),
        )

        self._attach_snapshot(
            completed_a,
            1,
            (Decimal("150"), Decimal("50"), Decimal("30"), Decimal("0"), Decimal("200")),
        )
        self._attach_snapshot(
            completed_b,
            1,
            (Decimal("400"), Decimal("70"), Decimal("40"), Decimal("0"), Decimal("470")),
        )
        self._attach_snapshot(
            historical_completed,
            1,
            (Decimal("150"), Decimal("0"), Decimal("0"), Decimal("0"), Decimal("150")),
        )

        self.client.force_authenticate(self.user)
        response = self.client.get(
            "/api/analytics/dashboard/?start_date=2026-01-01&end_date=2026-01-31"
            "&operational_start_date=2026-01-01&operational_end_date=2026-01-31"
        )
        self.assertEqual(response.status_code, 200)

        service_board = response.json()["service_board"]
        range_summary = service_board["range_summary"]
        self.assertEqual(range_summary["open_repairs_end_of_range"], 2)
        self.assertEqual(range_summary["vehicles_in_range"], 2)
        self.assertEqual(range_summary["customers_in_range"], 2)
        self.assertEqual(range_summary["returning_customers_in_range"], 1)
        self.assertEqual(range_summary["non_returning_customers_in_range"], 1)
        self.assertEqual(range_summary["returning_ratio"], 0.5)
        self.assertEqual(range_summary["median_cycle_time_days"], 12.0)
        self.assertEqual(range_summary["completed_repairs_in_range"], 2)

        current_snapshot = service_board["current_snapshot"]
        self.assertEqual(current_snapshot["waiting_parts_current"], 1)
        self.assertEqual(current_snapshot["open_repairs_current"], 2)

        all_time = service_board["all_time_totals"]
        self.assertEqual(all_time["repairs_total"], 5)
        self.assertEqual(all_time["vehicles_total"], 2)
        self.assertEqual(all_time["customers_total"], 2)
        self.assertEqual(all_time["returning_customers_total"], 1)
        self.assertEqual(all_time["non_returning_customers_total"], 1)
        self.assertEqual(all_time["masters_total"], 3)

        masters_current = {row["master_id"]: row for row in service_board["masters_current"]}
        self.assertEqual(masters_current[master_a.id]["assigned_open_current"], 1)
        self.assertEqual(masters_current[master_a.id]["current_status_counts"]["new"], 0)
        self.assertEqual(masters_current[master_a.id]["current_status_counts"]["in_progress"], 1)
        self.assertEqual(masters_current[master_a.id]["current_status_counts"]["waiting_parts"], 0)
        self.assertEqual(masters_current[master_a.id]["waiting_parts_current"], 0)
        self.assertEqual(masters_current[master_a.id]["estimated_assigned_value_current"], 400.0)
        self.assertEqual(masters_current[master_b.id]["assigned_open_current"], 1)
        self.assertEqual(masters_current[master_b.id]["current_status_counts"]["new"], 0)
        self.assertEqual(masters_current[master_b.id]["current_status_counts"]["in_progress"], 0)
        self.assertEqual(masters_current[master_b.id]["current_status_counts"]["waiting_parts"], 1)
        self.assertEqual(masters_current[master_b.id]["waiting_parts_current"], 1)
        self.assertEqual(masters_current[master_b.id]["estimated_assigned_value_current"], 150.0)

        masters_range = {row["master_id"]: row for row in service_board["masters_range"]}
        self.assertEqual(masters_range[master_a.id]["completed_in_range"], 1)
        self.assertEqual(masters_range[master_a.id]["median_cycle_time_days"], 10.0)
        self.assertEqual(masters_range[master_a.id]["actual_service_value_completed"], 200.0)
        self.assertEqual(masters_range[master_b.id]["completed_in_range"], 1)
        self.assertEqual(masters_range[master_b.id]["median_cycle_time_days"], 14.0)
        self.assertEqual(masters_range[master_b.id]["actual_service_value_completed"], 470.0)

        # Existing current repairs stay untouched to ensure the payload is purely read-only.
        self.assertEqual(Repair.objects.get(pk=open_repair.pk).status, Repair.Status.IN_PROGRESS)
        self.assertEqual(Repair.objects.get(pk=waiting_repair.pk).status, Repair.Status.WAITING_PARTS)
