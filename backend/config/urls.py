from django.contrib import admin
from django.urls import include, path

from foundation.views import HealthView, VersionView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", HealthView.as_view(), name="health"),
    path("api/version", VersionView.as_view(), name="version"),
    path("api/auth/", include("users.urls")),
    path("api/customers/", include("customers.urls")),
    path("api/vehicles/", include("vehicles.urls")),
]
