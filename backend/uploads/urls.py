from django.urls import path

from .views import InvoiceUploadView

urlpatterns = [
    path("invoice/", InvoiceUploadView.as_view(), name="invoice-upload"),
]
