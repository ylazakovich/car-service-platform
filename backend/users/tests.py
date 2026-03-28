import uuid

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import InviteToken

User = get_user_model()


class AuthApiTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=False)
        self.password = "manager12345"
        self.user = User.objects.create_user(
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


class InviteApiTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=False)
        self.admin_password = "adminpass123"
        self.staff_password = "staffpass123"
        self.admin = User.objects.create_user(
            email="admin@test.local",
            password=self.admin_password,
            role="admin",
            is_staff=True,
        )
        self.staff = User.objects.create_user(
            email="staff@test.local",
            password=self.staff_password,
            role="staff",
            is_staff=False,
        )

    def _login_as_admin(self):
        self.client.post(
            "/api/auth/login",
            {"email": self.admin.email, "password": self.admin_password},
            format="json",
        )

    def _login_as_staff(self):
        self.client.post(
            "/api/auth/login",
            {"email": self.staff.email, "password": self.staff_password},
            format="json",
        )

    def _create_invite(self, email="newuser@test.local", role="staff"):
        return self.client.post(
            "/api/auth/users/invite/",
            {"email": email, "role": role},
            format="json",
        )

    def test_invite_create_by_admin(self):
        self._login_as_admin()

        response = self._create_invite("invited@test.local", "staff")

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["email"], "invited@test.local")
        self.assertEqual(data["role"], "staff")
        self.assertIn("invite_url", data)
        self.assertIn("/invite/accept?token=", data["invite_url"])

    def test_invite_create_permission_denied_for_staff(self):
        self._login_as_staff()

        response = self._create_invite("invited@test.local", "staff")

        self.assertEqual(response.status_code, 403)

    def test_invite_create_duplicate_email(self):
        self._login_as_admin()

        response = self._create_invite(self.staff.email, "staff")

        self.assertEqual(response.status_code, 400)

    def test_accept_invite_sets_password(self):
        self._login_as_admin()
        create_response = self._create_invite("toacceptinvite@test.local", "staff")
        invite_url = create_response.json()["invite_url"]
        token = invite_url.split("token=")[1]
        self.client.post("/api/auth/logout")

        response = self.client.post(
            "/api/auth/users/invite/accept",
            {"token": token, "password": "newpassword1"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        login_response = self.client.post(
            "/api/auth/login",
            {"email": "toacceptinvite@test.local", "password": "newpassword1"},
            format="json",
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response.json()["email"], "toacceptinvite@test.local")

    def test_accept_invite_expired_token(self):
        invited_user = User.objects.create_user(
            email="expired@test.local",
            role="staff",
        )
        invited_user.set_unusable_password()
        invited_user.save()
        invite = InviteToken(user=invited_user, expires_at=timezone.now() - timezone.timedelta(days=1))
        invite.save()

        response = self.client.post(
            "/api/auth/users/invite/accept",
            {"token": str(invite.token), "password": "validpass123"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_accept_invite_invalid_token(self):
        response = self.client.post(
            "/api/auth/users/invite/accept",
            {"token": str(uuid.uuid4()), "password": "validpass123"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_accept_invite_short_password(self):
        self._login_as_admin()
        create_response = self._create_invite("shortpwd@test.local", "staff")
        invite_url = create_response.json()["invite_url"]
        token = invite_url.split("token=")[1]
        self.client.post("/api/auth/logout")

        response = self.client.post(
            "/api/auth/users/invite/accept",
            {"token": token, "password": "short"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_reset_invite(self):
        self._login_as_admin()
        create_response = self._create_invite("toreset@test.local", "staff")
        user_id = create_response.json()["id"]

        response = self.client.post(f"/api/auth/users/{user_id}/reset-invite/")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("invite_url", data)
        self.assertIn("/invite/accept?token=", data["invite_url"])

    def test_user_list_requires_admin(self):
        self._login_as_staff()
        staff_response = self.client.get("/api/auth/users/")
        self.assertEqual(staff_response.status_code, 403)
        self.client.post("/api/auth/logout")

        self._login_as_admin()
        admin_response = self.client.get("/api/auth/users/")
        self.assertEqual(admin_response.status_code, 200)
        self.assertIsInstance(admin_response.json(), list)


class LoginRateLimitTests(TestCase):
    def setUp(self):
        self.client = APIClient(enforce_csrf_checks=False)
        self.user = User.objects.create_user(
            email="ratelimit@test.local",
            password="correctpass123",
            role="staff",
        )

    def tearDown(self):
        from django.core.cache import cache
        cache.clear()

    def _attempt_login(self, password="wrongpassword"):
        return self.client.post(
            "/api/auth/login",
            {"email": self.user.email, "password": password},
            format="json",
        )

    def test_login_blocked_after_10_failed_attempts(self):
        for _ in range(10):
            response = self._attempt_login("wrongpassword")
            self.assertEqual(response.status_code, 401)

        response = self._attempt_login("wrongpassword")
        self.assertEqual(response.status_code, 429)

    def test_rate_limit_cleared_on_successful_login(self):
        for _ in range(5):
            self._attempt_login("wrongpassword")

        response = self._attempt_login("correctpass123")
        self.assertEqual(response.status_code, 200)

        response = self._attempt_login("wrongpassword")
        self.assertEqual(response.status_code, 401)

    def test_correct_login_not_blocked_before_limit(self):
        for _ in range(9):
            self._attempt_login("wrongpassword")

        response = self._attempt_login("correctpass123")
        self.assertEqual(response.status_code, 200)
