import tempfile
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from customers.models import Customer
from purchases.models import Purchase, Supplier
from services.models import Service
from vehicles.models import Vehicle

from .models import Repair, RepairDocument, RepairFinancialSnapshot, RepairNote


class RepairApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = get_user_model().objects.create_user(
            email="staff@test.local",
            password="staff12345",
            role="staff",
        )
        self.admin_user = get_user_model().objects.create_user(
            email="admin@test.local",
            password="admin12345",
            role="admin",
            is_staff=True,
        )
        self.customer = Customer.objects.create(
            full_name="Anna Nowak",
            phone="+48 600 200 300",
            assigned_to=self.staff_user,
        )
        self.vehicle = Vehicle.objects.create(
            customer=self.customer,
            license_plate="WA 99999",
            make="Toyota",
            model="Yaris",
        )

    def _create_repair(self, service_name="Oil Change", issue_notes="Standard service"):
        self.client.force_authenticate(self.staff_user)
        response = self.client.post(
            "/api/repairs/",
            {
                "vehicle_id": self.vehicle.id,
                "service_name": service_name,
                "issue_notes": issue_notes,
                "status": "new",
                "master_id": None,
            },
            format="json",
        )
        self.client.force_authenticate(None)
        return response

    def test_authentication_required(self):
        response = self.client.get("/api/repairs/", format="json")

        self.assertEqual(response.status_code, 403)

    def test_create_repair(self):
        self.client.force_authenticate(self.staff_user)

        response = self.client.post(
            "/api/repairs/",
            {
                "vehicle_id": self.vehicle.id,
                "service_name": "Brake Replacement",
                "issue_notes": "Front brakes worn out",
                "status": "new",
                "master_id": None,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["vehicle_id"], self.vehicle.id)
        self.assertTrue(data["tracking_code"].startswith("TOR-"))
        self.assertIn(self.vehicle.license_plate, data["vehicle_label"])
        self.assertEqual(data["owner_name"], self.customer.full_name)

    def test_tracking_code_auto_generated(self):
        first_response = self._create_repair(service_name="Oil Change")
        second_response = self._create_repair(service_name="Tire Rotation")

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 201)
        first_code = first_response.json()["tracking_code"]
        second_code = second_response.json()["tracking_code"]
        self.assertTrue(first_code.startswith("TOR-"))
        self.assertTrue(second_code.startswith("TOR-"))
        self.assertNotEqual(first_code, second_code)

    def test_list_repairs(self):
        self.client.force_authenticate(self.staff_user)
        Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Oil Change",
            status="new",
        )
        Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Tire Rotation",
            status="new",
        )

        response = self.client.get("/api/repairs/", format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)
        self.assertEqual(response.json()[0]["vehicle_id"], self.vehicle.id)

    def test_search_repairs(self):
        self.client.force_authenticate(self.staff_user)
        Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Engine Diagnostic",
            status="new",
        )
        Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Windshield Replacement",
            status="new",
        )

        response = self.client.get("/api/repairs/", {"q": "Engine Diagnostic"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["service_name"], "Engine Diagnostic")

    def test_update_repair_status(self):
        self.client.force_authenticate(self.staff_user)
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Clutch Repair",
            status="new",
        )

        response = self.client.patch(
            f"/api/repairs/{repair.id}",
            {"status": "in_progress"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "in_progress")
        self.assertIsNone(response.json()["completed_at"])

    def test_completed_at_is_set_when_repair_is_completed(self):
        self.client.force_authenticate(self.staff_user)
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Clutch Repair",
            status="in_progress",
        )

        response = self.client.patch(
            f"/api/repairs/{repair.id}",
            {"status": "completed"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "completed")
        self.assertIsNotNone(response.json()["completed_at"])

    def test_completed_at_can_be_overridden_manually(self):
        self.client.force_authenticate(self.staff_user)
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Alignment",
            status="completed",
            completed_at="2025-03-05",
        )

        response = self.client.patch(
            f"/api/repairs/{repair.id}",
            {"status": "completed", "completed_at": "2025-03-08"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["completed_at"], "2025-03-08")

    def test_completed_at_is_cleared_when_repair_leaves_completed(self):
        self.client.force_authenticate(self.staff_user)
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Alignment",
            status="completed",
            completed_at="2025-03-05",
        )

        response = self.client.patch(
            f"/api/repairs/{repair.id}",
            {"status": "in_progress"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "in_progress")
        self.assertIsNone(response.json()["completed_at"])

    def test_delete_repair(self):
        self.client.force_authenticate(self.staff_user)
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Battery Replacement",
            status="new",
        )

        response = self.client.delete(f"/api/repairs/{repair.id}", format="json")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(Repair.objects.count(), 0)

    def test_add_note_to_repair(self):
        self.client.force_authenticate(self.staff_user)
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Suspension Check",
            status="new",
        )

        response = self.client.post(
            f"/api/repairs/{repair.id}/notes/",
            {"text": "Test note"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["author_email"], self.staff_user.email)
        self.assertEqual(data["text"], "Test note")

    def test_delete_own_note(self):
        self.client.force_authenticate(self.staff_user)
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Exhaust Repair",
            status="new",
        )
        note_response = self.client.post(
            f"/api/repairs/{repair.id}/notes/",
            {"text": "My note"},
            format="json",
        )
        note_id = note_response.json()["id"]

        response = self.client.delete(
            f"/api/repairs/{repair.id}/notes/{note_id}",
            format="json",
        )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(RepairNote.objects.filter(id=note_id).exists())

    def test_cannot_delete_other_users_note(self):
        self.client.force_authenticate(self.staff_user)
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="AC Service",
            status="new",
        )
        note = RepairNote.objects.create(
            repair=repair,
            author=self.admin_user,
            author_name="Admin User",
            author_email=self.admin_user.email,
            text="Admin note",
        )

        response = self.client.delete(
            f"/api/repairs/{repair.id}/notes/{note.id}",
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_master_id_returned_in_list_response(self):
        master = get_user_model().objects.create_user(
            email="master@test.local",
            password="master12345",
            role="staff",
        )
        self.client.force_authenticate(self.staff_user)
        Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Wheel Alignment",
            status="new",
            master=master,
        )

        response = self.client.get("/api/repairs/", format="json")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertIn("master_id", data[0])
        self.assertEqual(data[0]["master_id"], master.id)

    def test_master_id_null_when_unassigned(self):
        self.client.force_authenticate(self.staff_user)
        Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Wheel Alignment",
            status="new",
        )

        response = self.client.get("/api/repairs/", format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()[0]["master_id"])

    def test_create_repair_with_master_returns_master_id(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.post(
            "/api/repairs/",
            {
                "vehicle_id": self.vehicle.id,
                "service_name": "Gearbox Service",
                "issue_notes": "Grinding on 3rd gear",
                "status": "new",
                "master_id": self.staff_user.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["master_id"], self.staff_user.id)
        self.assertEqual(data["master_name"], self.staff_user.email)

    def test_update_master_via_patch_reflects_in_response(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Timing Belt",
            status="new",
        )
        self.client.force_authenticate(self.admin_user)

        response = self.client.patch(
            f"/api/repairs/{repair.id}",
            {"master_id": self.staff_user.id},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["master_id"], self.staff_user.id)
        self.assertEqual(data["master_name"], self.staff_user.email)

    def test_portal_token_auto_generated_on_create(self):
        response = self._create_repair(service_name="Turbo Replacement")

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("portal_token", data)
        self.assertTrue(len(data["portal_token"]) >= 20)

    def test_portal_tokens_are_unique(self):
        first = self._create_repair(service_name="Brake Pads")
        second = self._create_repair(service_name="Clutch Kit")

        self.assertNotEqual(
            first.json()["portal_token"],
            second.json()["portal_token"],
        )

    def test_portal_token_is_readonly(self):
        self.client.force_authenticate(self.staff_user)
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Wheel Bearing",
            status="new",
        )
        original_token = repair.portal_token

        self.client.patch(
            f"/api/repairs/{repair.id}",
            {"portal_token": "manipulated-token"},
            format="json",
        )

        repair.refresh_from_db()
        self.assertEqual(repair.portal_token, original_token)

    def test_portal_lookup_returns_repair_for_valid_token(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="AC Recharge",
            status="in_progress",
        )

        response = self.client.get(f"/api/portal/{repair.portal_token}/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["service_name"], "AC Recharge")
        self.assertEqual(data["status"], "in_progress")

    def test_portal_lookup_returns_404_for_invalid_token(self):
        response = self.client.get("/api/portal/this-token-does-not-exist/")

        self.assertEqual(response.status_code, 404)

    def test_portal_lookup_requires_no_authentication(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Fuel Filter",
            status="new",
        )
        self.client.force_authenticate(None)

        response = self.client.get(f"/api/portal/{repair.portal_token}/")

        self.assertEqual(response.status_code, 200)

    def test_portal_lookup_does_not_expose_internal_fields(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Injector Clean",
            status="new",
        )

        response = self.client.get(f"/api/portal/{repair.portal_token}/")

        data = response.json()
        self.assertNotIn("portal_token", data)
        self.assertNotIn("issue_notes", data)
        self.assertNotIn("repair_notes", data)
        self.assertNotIn("master_id", data)

    def test_portal_lookup_includes_vehicle_info(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Suspension",
            status="new",
        )

        response = self.client.get(f"/api/portal/{repair.portal_token}/")

        data = response.json()
        self.assertIn("vehicle_info", data)
        self.assertEqual(data["vehicle_info"]["license_plate"], self.vehicle.license_plate)

    def test_regenerate_portal_token_requires_authentication(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Coolant Flush",
            status="new",
        )
        self.client.force_authenticate(None)

        response = self.client.post(f"/api/repairs/{repair.id}/regenerate-portal-token/")

        self.assertEqual(response.status_code, 403)

    def test_regenerate_portal_token_generates_new_token(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Power Steering",
            status="new",
        )
        original_token = repair.portal_token
        self.client.force_authenticate(self.admin_user)

        response = self.client.post(f"/api/repairs/{repair.id}/regenerate-portal-token/")

        self.assertEqual(response.status_code, 200)
        new_token = response.json()["portal_token"]
        self.assertNotEqual(new_token, original_token)
        self.assertTrue(len(new_token) >= 20)

    def test_regenerate_portal_token_old_token_becomes_invalid(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="ABS Module",
            status="new",
        )
        old_token = repair.portal_token
        self.client.force_authenticate(self.admin_user)
        self.client.post(f"/api/repairs/{repair.id}/regenerate-portal-token/")
        self.client.force_authenticate(None)

        response = self.client.get(f"/api/portal/{old_token}/")

        self.assertEqual(response.status_code, 404)

    def test_regenerate_portal_token_staff_forbidden(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Fuel Filter",
            status="new",
        )
        self.client.force_authenticate(self.staff_user)

        response = self.client.post(f"/api/repairs/{repair.id}/regenerate-portal-token/")

        self.assertEqual(response.status_code, 403)

    def test_estimated_date_can_be_set_and_returned(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Transmission",
            status="in_progress",
        )
        self.client.force_authenticate(self.staff_user)

        response = self.client.patch(
            f"/api/repairs/{repair.id}",
            {"estimated_date": "2025-12-31"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["estimated_date"], "2025-12-31")

    def test_estimated_date_visible_on_portal(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Camshaft",
            status="in_progress",
            estimated_date="2025-12-31",
        )

        response = self.client.get(f"/api/portal/{repair.portal_token}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["estimated_date"], "2025-12-31")


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class RepairPdfViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = get_user_model().objects.create_user(
            email="staff@test.local",
            password="staff12345",
            role="staff",
        )
        self.admin_user = get_user_model().objects.create_user(
            email="admin@test.local",
            password="admin12345",
            role="admin",
        )
        self.customer = Customer.objects.create(
            full_name="Anna Nowak",
            phone="+48 600 200 300",
            assigned_to=self.staff_user,
        )
        self.vehicle = Vehicle.objects.create(
            customer=self.customer,
            license_plate="WA 99999",
            make="Toyota",
            model="Yaris",
        )

    def _create_completed_repair(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Full Service",
            status="new",
        )
        repair.status = "completed"
        repair.save()
        return repair

    def test_pdf_requires_authentication(self):
        repair = self._create_completed_repair()

        self.assertEqual(self.client.get(f"/api/repairs/{repair.id}/pdf/").status_code, 403)
        self.assertEqual(self.client.post(f"/api/repairs/{repair.id}/pdf/export/").status_code, 403)

    def test_pdf_returns_400_for_non_completed_repair(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Oil Change",
            status="new",
        )
        self.client.force_authenticate(self.staff_user)

        response = self.client.get(f"/api/repairs/{repair.id}/pdf/")

        self.assertEqual(response.status_code, 400)

    def test_pdf_returns_400_for_in_progress_repair(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Brake Check",
            status="in_progress",
        )
        self.client.force_authenticate(self.staff_user)

        response = self.client.get(f"/api/repairs/{repair.id}/pdf/")

        self.assertEqual(response.status_code, 400)

    def test_pdf_get_404_when_no_export_yet(self):
        repair = self._create_completed_repair()
        self.client.force_authenticate(self.staff_user)

        response = self.client.get(f"/api/repairs/{repair.id}/pdf/")

        self.assertEqual(response.status_code, 404)
        self.assertIn("detail", response.json())

    def test_pdf_get_returns_latest_after_post_export(self):
        repair = self._create_completed_repair()
        self.client.force_authenticate(self.staff_user)
        post_r = self.client.post(f"/api/repairs/{repair.id}/pdf/export/")
        self.assertEqual(post_r.status_code, 200)
        self.assertEqual(post_r["Content-Type"], "application/pdf")

        get_r = self.client.get(f"/api/repairs/{repair.id}/pdf/")
        self.assertEqual(get_r.status_code, 200)
        self.assertEqual(get_r["Content-Type"], "application/pdf")
        self.assertEqual(get_r.content, post_r.content)

    def test_pdf_returns_404_for_unknown_repair(self):
        self.client.force_authenticate(self.staff_user)

        response = self.client.get("/api/repairs/99999/pdf/")

        self.assertEqual(response.status_code, 404)

    def test_pdf_get_twice_does_not_create_second_document(self):
        repair = self._create_completed_repair()
        self.client.force_authenticate(self.staff_user)
        self.client.post(f"/api/repairs/{repair.id}/pdf/export/")
        self.client.get(f"/api/repairs/{repair.id}/pdf/")
        self.client.get(f"/api/repairs/{repair.id}/pdf/")
        self.assertEqual(RepairDocument.objects.filter(repair=repair).count(), 1)

    def test_pdf_export_post_400_for_non_completed(self):
        repair = Repair.objects.create(
            vehicle=self.vehicle,
            service_name="Oil",
            status="new",
        )
        self.client.force_authenticate(self.staff_user)
        response = self.client.post(f"/api/repairs/{repair.id}/pdf/export/")
        self.assertEqual(response.status_code, 400)

    def test_pdf_export_persists_document_and_snapshot(self):
        repair = self._create_completed_repair()
        supplier = Supplier.objects.create(name="Parts Co")
        Purchase.objects.create(
            order_date="2026-01-10",
            supplier=supplier,
            vehicle=self.vehicle,
            part_name="Brake pad",
            quantity=2,
            purchase_price=Decimal("40.00"),
            sale_price=Decimal("99.50"),
            repair_code=repair.tracking_code,
        )
        Service.objects.create(name="Full Service", price=Decimal("150.00"))

        self.assertEqual(RepairDocument.objects.filter(repair=repair).count(), 0)
        self.client.force_authenticate(self.staff_user)
        response = self.client.post(f"/api/repairs/{repair.id}/pdf/export/")
        self.assertEqual(response.status_code, 200)

        doc = RepairDocument.objects.get(repair=repair)
        self.assertEqual(doc.version, 1)
        self.assertEqual(doc.exported_by_id, self.staff_user.id)
        self.assertTrue(doc.file.name)
        snap = RepairFinancialSnapshot.objects.get(document=doc)
        self.assertEqual(snap.labor_total, Decimal("150.00"))
        self.assertEqual(snap.parts_client_total, Decimal("199.00"))
        self.assertEqual(snap.parts_purchase_total, Decimal("80.00"))
        self.assertEqual(snap.document_total, Decimal("349.00"))

    def test_pdf_second_post_export_increments_version(self):
        repair = self._create_completed_repair()
        self.client.force_authenticate(self.staff_user)
        self.client.post(f"/api/repairs/{repair.id}/pdf/export/")
        self.client.post(f"/api/repairs/{repair.id}/pdf/export/")
        versions = list(
            RepairDocument.objects.filter(repair=repair).order_by("version").values_list("version", flat=True)
        )
        self.assertEqual(versions, [1, 2])
        self.assertEqual(RepairFinancialSnapshot.objects.filter(repair=repair).count(), 2)

    def test_repairs_list_includes_has_pdf_flag(self):
        without_pdf = self._create_completed_repair()
        with_pdf = self._create_completed_repair()
        self.client.force_authenticate(self.staff_user)
        self.client.post(f"/api/repairs/{with_pdf.id}/pdf/export/")

        response = self.client.get("/api/repairs/")

        self.assertEqual(response.status_code, 200)
        by_id = {row["id"]: row for row in response.json()}
        self.assertIs(by_id[without_pdf.id]["has_pdf"], False)
        self.assertIs(by_id[with_pdf.id]["has_pdf"], True)

    def test_repairs_list_includes_latest_act_document_total(self):
        without_pdf = self._create_completed_repair()
        with_pdf = self._create_completed_repair()
        supplier = Supplier.objects.create(name="Parts Co")
        Purchase.objects.create(
            order_date="2026-01-10",
            supplier=supplier,
            vehicle=self.vehicle,
            part_name="Brake pad",
            quantity=2,
            purchase_price=Decimal("40.00"),
            sale_price=Decimal("99.50"),
            repair_code=with_pdf.tracking_code,
        )
        Service.objects.create(name="Full Service", price=Decimal("150.00"))
        self.client.force_authenticate(self.staff_user)
        self.client.post(f"/api/repairs/{with_pdf.id}/pdf/export/")

        response = self.client.get("/api/repairs/")
        self.assertEqual(response.status_code, 200)
        by_id = {row["id"]: row for row in response.json()}
        self.assertIsNone(by_id[without_pdf.id]["latest_act_document_total"])
        self.assertEqual(by_id[with_pdf.id]["latest_act_document_total"], 349.0)
