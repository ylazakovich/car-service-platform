from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient


class AuthApiTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=False)
        self.password = "manager12345"
        self.user = get_user_model().objects.create_user(
            email="manager@test.local",
            password=self.password,
            role="staff",
        )

    def test_login_me_and_logout_flow(self):
        response = self.client.get("/api/auth/csrf")
        self.assertEqual(response.status_code, 200)

        response = self.client.post(
            "/api/auth/login",
            {"email": self.user.email, "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["email"], self.user.email)

        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["role"], "staff")

        response = self.client.post("/api/auth/logout")
        self.assertEqual(response.status_code, 200)

        response = self.client.get("/api/auth/me")
        self.assertEqual(response.status_code, 403)
