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
