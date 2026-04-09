from django.urls import path

from .views import (
    PurchaseBulkCreateView,
    PurchaseDetailView,
    PurchaseListCreateView,
    SupplierDetailView,
    SupplierListCreateView,
    UnitOfMeasureDetailView,
    UnitOfMeasureListCreateView,
    UnitOfMeasureReorderView,
)

urlpatterns = [
    path("", PurchaseListCreateView.as_view(), name="purchase-list"),
    path("bulk/", PurchaseBulkCreateView.as_view(), name="purchase-bulk-create"),
    path("<int:pk>", PurchaseDetailView.as_view(), name="purchase-detail"),
    path("suppliers/", SupplierListCreateView.as_view(), name="supplier-list"),
    path("suppliers/<int:pk>", SupplierDetailView.as_view(), name="supplier-detail"),
    path("units/", UnitOfMeasureListCreateView.as_view(), name="unit-of-measure-list"),
    path("units/reorder/", UnitOfMeasureReorderView.as_view(), name="unit-of-measure-reorder"),
    path("units/<int:pk>", UnitOfMeasureDetailView.as_view(), name="unit-of-measure-detail"),
]
