import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

User = get_user_model()

UPLOAD_URL = "/api/uploads/invoice/"


def make_pdf(name="invoice.pdf", size=1024):
    return SimpleUploadedFile(name, b"%PDF-1.4 " + b"x" * size, content_type="application/pdf")


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class InvoiceUploadTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=False)
        self.admin_password = "adminpass123"
        self.staff_password = "staffpass123"
        self.admin = User.objects.create_user(
            email="admin@upload.local",
            password=self.admin_password,
            role="admin",
            is_staff=True,
        )
        self.staff = User.objects.create_user(
            email="staff@upload.local",
            password=self.staff_password,
            role="staff",
        )

    def _login(self, user, password):
        self.client.post(
            "/api/auth/login",
            {"email": user.email, "password": password},
            format="json",
        )

    def test_admin_can_upload_valid_pdf(self):
        self._login(self.admin, self.admin_password)

        response = self.client.post(UPLOAD_URL, {"file": make_pdf()}, format="multipart")

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("url", data)
        self.assertIn("name", data)
        self.assertIn("/media/invoices/", data["url"])

    def test_staff_can_upload_valid_pdf(self):
        self._login(self.staff, self.staff_password)

        response = self.client.post(UPLOAD_URL, {"file": make_pdf()}, format="multipart")

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("url", data)
        self.assertIn("name", data)

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.post(UPLOAD_URL, {"file": make_pdf()}, format="multipart")

        self.assertIn(response.status_code, [401, 403])

    def test_missing_file_returns_400(self):
        self._login(self.admin, self.admin_password)

        response = self.client.post(UPLOAD_URL, {}, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

    def test_disallowed_extension_returns_400(self):
        self._login(self.admin, self.admin_password)
        exe_file = SimpleUploadedFile("payload.exe", b"MZ\x90\x00", content_type="application/octet-stream")

        response = self.client.post(UPLOAD_URL, {"file": exe_file}, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())

    def test_oversized_file_returns_400(self):
        self._login(self.admin, self.admin_password)
        oversized = SimpleUploadedFile(
            "big.pdf",
            b"%PDF-1.4 " + b"x" * (10 * 1024 * 1024 + 1),
            content_type="application/pdf",
        )

        response = self.client.post(UPLOAD_URL, {"file": oversized}, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.assertIn("detail", response.json())
