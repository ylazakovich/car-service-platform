from django.urls import path

from .views import PurchaseDetailView, PurchaseListCreateView, SupplierDetailView, SupplierListCreateView

urlpatterns = [
    path("", PurchaseListCreateView.as_view(), name="purchase-list"),
    path("<int:pk>", PurchaseDetailView.as_view(), name="purchase-detail"),
    path("suppliers/", SupplierListCreateView.as_view(), name="supplier-list"),
    path("suppliers/<int:pk>", SupplierDetailView.as_view(), name="supplier-detail"),
]
