import os
import platform
import time

import django
from django.db import connection
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

_start_time = time.time()


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        db_ok = True
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception:
            db_ok = False

        status_code = 200 if db_ok else 503
        return Response(
            {
                "status": "ok" if db_ok else "degraded",
                "db": db_ok,
                "service": "car-service-platform",
            },
            status=status_code,
        )


class VersionView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        uptime_seconds = int(time.time() - _start_time)
        return Response(
            {
                "service": "car-service-platform",
                "commit": os.environ.get("GIT_COMMIT", "unknown"),
                "python": platform.python_version(),
                "django": django.__version__,
                "uptime_seconds": uptime_seconds,
                "debug": os.environ.get("DJANGO_DEBUG", "False").lower() in ("true", "1"),
            }
        )
