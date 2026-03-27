from django.urls import path

from .views import ServiceDetailView, ServiceListCreateView

urlpatterns = [
    path("", ServiceListCreateView.as_view(), name="service-list"),
    path("<int:pk>", ServiceDetailView.as_view(), name="service-detail"),
]
