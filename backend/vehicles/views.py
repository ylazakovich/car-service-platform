from django.db.models import Q
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied

from customers.models import Customer
from .models import Vehicle
from .serializers import VehicleSerializer


class VehicleListCreateView(generics.ListCreateAPIView):
    serializer_class = VehicleSerializer

    def get_queryset(self):
        if self.request.user.role == "admin":
            queryset = Vehicle.objects.select_related("customer").all().order_by("license_plate")
        else:
            customer_ids = Customer.objects.filter(assigned_to=self.request.user).values_list("id", flat=True)
            queryset = Vehicle.objects.select_related("customer").filter(customer_id__in=customer_ids).order_by("license_plate")
        query = self.request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(
                Q(license_plate__icontains=query)
                | Q(make__icontains=query)
                | Q(model__icontains=query)
                | Q(vin__icontains=query)
                | Q(customer__full_name__icontains=query)
            )
        return queryset


class VehicleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VehicleSerializer

    def get_queryset(self):
        return Vehicle.objects.select_related("customer")

    def get_object(self):
        obj = super().get_object()
        if self.request.user.role == "staff" and obj.customer.assigned_to != self.request.user:
            raise PermissionDenied
        return obj
