import os

from .settings import *  # noqa: F401,F403

TEST_OUTPUT_DIR = os.environ.get("TEST_OUTPUT_DIR", "test-results")

# WhiteNoise manifest + missing STATIC_ROOT spam dozens of UserWarnings per test module.
STATIC_ROOT.mkdir(parents=True, exist_ok=True)
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
STORAGES["staticfiles"] = {  # type: ignore[index]
    "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
}

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
