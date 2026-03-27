from django.db.models import Q
from rest_framework import generics

from .models import Purchase, Supplier
from .serializers import PurchaseSerializer, SupplierSerializer


class SupplierListCreateView(generics.ListCreateAPIView):
    serializer_class = SupplierSerializer

    def get_queryset(self):
        queryset = Supplier.objects.all()
        query = self.request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(Q(name__icontains=query))
        return queryset


class SupplierDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SupplierSerializer
    queryset = Supplier.objects.all()


class PurchaseListCreateView(generics.ListCreateAPIView):
    serializer_class = PurchaseSerializer

    def get_queryset(self):
        queryset = Purchase.objects.select_related("supplier", "vehicle").all()
        query = self.request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(
                Q(part_name__icontains=query)
                | Q(supplier__name__icontains=query)
                | Q(repair_code__icontains=query)
            )
        return queryset


class PurchaseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PurchaseSerializer
    queryset = Purchase.objects.select_related("supplier", "vehicle").all()
