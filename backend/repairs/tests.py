from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from customers.models import Customer
from vehicles.models import Vehicle

from .models import Repair, RepairNote


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

        response = self.client.get(f"/api/repairs/{repair.id}/pdf/")

        self.assertEqual(response.status_code, 403)

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

    def test_pdf_returns_pdf_for_completed_repair(self):
        repair = self._create_completed_repair()
        self.client.force_authenticate(self.staff_user)

        response = self.client.get(f"/api/repairs/{repair.id}/pdf/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertGreater(len(response.content), 0)

    def test_pdf_returns_404_for_unknown_repair(self):
        self.client.force_authenticate(self.staff_user)

        response = self.client.get("/api/repairs/99999/pdf/")

        self.assertEqual(response.status_code, 404)

    def test_pdf_accessible_by_staff(self):
        repair = self._create_completed_repair()
        self.client.force_authenticate(self.staff_user)

        response = self.client.get(f"/api/repairs/{repair.id}/pdf/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertGreater(len(response.content), 0)
