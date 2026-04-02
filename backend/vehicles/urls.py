from django.urls import path

from .views import VehicleDetailView, VehicleListCreateView, VehicleRepairHistoryView

urlpatterns = [
    path("", VehicleListCreateView.as_view(), name="vehicle-list"),
    path("<int:pk>", VehicleDetailView.as_view(), name="vehicle-detail"),
    path("<int:pk>/repairs/", VehicleRepairHistoryView.as_view(), name="vehicle-repair-history"),
]
