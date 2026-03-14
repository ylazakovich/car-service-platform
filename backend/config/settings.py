import os
from pathlib import Path

from django.templatetags.static import static
from django.urls import reverse_lazy

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-only-change-me",
)
DEBUG = os.environ.get("DJANGO_DEBUG", "False").lower() in ("true", "1", "yes")
ALLOWED_HOSTS = [host.strip() for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if host.strip()]

INSTALLED_APPS = [
    "unfold",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "users",
    "foundation",
    "customers",
    "vehicles",
]

MIDDLEWARE = [
    "config.middleware.RequestIdMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "car_service_platform"),
        "USER": os.environ.get("POSTGRES_USER", "car_service_platform"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "car_service_platform"),
        "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
    }
}

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:4173").split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:4173").split(",")
    if origin.strip()
]

# URL of the main frontend app (used e.g. for admin "View site" link)
_frontend_base = (CORS_ALLOWED_ORIGINS[0] if CORS_ALLOWED_ORIGINS else "http://localhost:4173").rstrip("/")
FRONTEND_URL = os.environ.get("FRONTEND_URL", f"{_frontend_base}/app")

UNFOLD = {
    "SITE_TITLE": "Administration Panel",
    "SITE_HEADER": "Administration Panel",
    "SITE_URL": FRONTEND_URL,
    "COLORS": {
        "primary": {
            "50": "oklch(97% .02 250)",
            "100": "oklch(93% .05 250)",
            "200": "oklch(88% .08 250)",
            "300": "oklch(78% .12 250)",
            "400": "oklch(68% .16 250)",
            "500": "oklch(58% .18 250)",
            "600": "oklch(50% .16 250)",
            "700": "oklch(42% .14 250)",
            "800": "oklch(35% .12 250)",
            "900": "oklch(28% .10 250)",
            "950": "oklch(20% .06 250)",
        },
    },
    "DASHBOARD_CALLBACK": "config.admin_callbacks.dashboard_callback",
    "STYLES": [
        lambda request: static("unfold/sidebar.css"),
    ],
    "SIDEBAR": {
        "navigation": [
            {
                "title": "Authorization",
                "collapsible": True,
                "items": [
                    {"title": "Groups", "link": reverse_lazy("admin:auth_group_changelist")},
                    {"title": "Users", "link": reverse_lazy("admin:users_user_changelist")},
                ],
            },
            {
                "title": "Platform",
                "collapsible": True,
                "items": [
                    {"title": "Customers", "link": reverse_lazy("admin:customers_customer_changelist")},
                    {"title": "Vehicles", "link": reverse_lazy("admin:vehicles_vehicle_changelist")},
                ],
            },
        ],
    },
}

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.environ.get("TIME_ZONE", "UTC")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = os.environ.get("LOG_FORMAT", "json" if not DEBUG else "text").lower()

_formatters = {
    "text": {
        "format": "[{asctime}] {levelname} {name} [{req_id}]: {message}",
        "style": "{",
        "datefmt": "%Y-%m-%d %H:%M:%S",
    },
    "json": {
        "()": "pythonjsonlogger.json.JsonFormatter",
        "format": "%(asctime)s %(levelname)s %(name)s %(req_id)s %(message)s",
        "rename_fields": {"asctime": "timestamp", "levelname": "level", "name": "logger"},
    },
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "req_id": {
            "()": "config.middleware.RequestIdFilter",
        }
    },
    "formatters": {
        "default": _formatters.get(LOG_FORMAT, _formatters["text"]),
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "filters": ["req_id"],
        }
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
    "loggers": {
        "django": {
            "level": "WARNING",
            "propagate": True,
        }
    },
}

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"

if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
