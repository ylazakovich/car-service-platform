from django.urls import path

from .views import StaffDashboardAnalyticsView

urlpatterns = [
    path("dashboard/", StaffDashboardAnalyticsView.as_view(), name="staff-dashboard-analytics"),
]
