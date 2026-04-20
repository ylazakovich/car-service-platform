from django.urls import path

from .views import (
    InvoiceLineParseTemplateDetailView,
    InvoiceLineParseTemplateListCreateView,
    InvoiceParseExtractView,
    InvoiceParsePreviewView,
    InvoiceParseSuggestView,
    PurchaseBulkCreateView,
    PurchaseDetailView,
    PurchaseListCreateView,
    PurchaseOrderPdfView,
    SupplierAliasDetailView,
    SupplierAliasListCreateView,
    SupplierDetailView,
    SupplierListCreateView,
    UnitOfMeasureDetailView,
    UnitOfMeasureListCreateView,
    UnitOfMeasureReorderView,
)

urlpatterns = [
    path("invoice-parse-templates/", InvoiceLineParseTemplateListCreateView.as_view(), name="invoice-parse-template-list"),
    path(
        "invoice-parse-templates/<int:pk>",
        InvoiceLineParseTemplateDetailView.as_view(),
        name="invoice-parse-template-detail",
    ),
    path("invoice-parse/extract/", InvoiceParseExtractView.as_view(), name="invoice-parse-extract"),
    path("invoice-parse/suggest/", InvoiceParseSuggestView.as_view(), name="invoice-parse-suggest"),
    path("invoice-parse/preview/", InvoiceParsePreviewView.as_view(), name="invoice-parse-preview"),
    path("", PurchaseListCreateView.as_view(), name="purchase-list"),
    path("bulk/", PurchaseBulkCreateView.as_view(), name="purchase-bulk-create"),
    path("po/pdf/", PurchaseOrderPdfView.as_view(), name="purchase-order-pdf"),
    path("<int:pk>", PurchaseDetailView.as_view(), name="purchase-detail"),
    path("suppliers/", SupplierListCreateView.as_view(), name="supplier-list"),
    path("suppliers/<int:pk>", SupplierDetailView.as_view(), name="supplier-detail"),
    path(
        "suppliers/<int:supplier_id>/aliases/",
        SupplierAliasListCreateView.as_view(),
        name="supplier-alias-list",
    ),
    path(
        "suppliers/<int:supplier_id>/aliases/<int:pk>",
        SupplierAliasDetailView.as_view(),
        name="supplier-alias-detail",
    ),
    path("units/", UnitOfMeasureListCreateView.as_view(), name="unit-of-measure-list"),
    path("units/reorder/", UnitOfMeasureReorderView.as_view(), name="unit-of-measure-reorder"),
    path("units/<int:pk>", UnitOfMeasureDetailView.as_view(), name="unit-of-measure-detail"),
]
