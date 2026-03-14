from django.conf import settings
from django.contrib import admin
from django.urls import include, path

from foundation.views import HealthView, VersionView

admin.site.site_header = "Car Service Platform Admin"
admin.site.site_title = "Car Service Platform"
admin.site.index_title = "Operational control center"
admin.site.site_url = settings.FRONTEND_URL

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", HealthView.as_view(), name="health"),
    path("api/version", VersionView.as_view(), name="version"),
    path("api/auth/", include("users.urls")),
    path("api/customers/", include("customers.urls")),
    path("api/vehicles/", include("vehicles.urls")),
]
