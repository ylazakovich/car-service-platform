import os

from .settings import *  # noqa: F401,F403

TEST_OUTPUT_DIR = os.environ.get("TEST_OUTPUT_DIR", "test-results")

# Avoid admin sidebar/callback and URL resolution during tests
UNFOLD["DASHBOARD_CALLBACK"] = None
UNFOLD["SIDEBAR"] = {"navigation": []}
UNFOLD["STYLES"] = []

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
CORS_ALLOWED_ORIGINS = ["http://localhost:4173"]
LOGGING["root"]["level"] = "WARNING"  # type: ignore[name-defined]
