import tempfile
from datetime import date, datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from customers.models import Customer
from purchases.models import Purchase, Supplier
from repairs.models import Repair, RepairDocument, RepairFinancialSnapshot
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
        )
        Purchase.objects.create(
            order_date=date(2026, 1, 6),
            supplier=sup,
            part_name="Bolt",
            quantity=1,
            purchase_price=Decimal("5.00"),
            sale_price=Decimal("12.00"),
            repair_code="ABC",
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
        self.assertEqual(len(mf["exports_by_exporter"]), 1)
        self.assertEqual(mf["exports_by_exporter"][0]["user_id"], self.user.id)
        self.assertEqual(mf["exports_by_exporter"][0]["export_count"], 1)
