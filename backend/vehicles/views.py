from django.db.models import Q
from rest_framework import generics

from .models import Vehicle
from .serializers import VehicleSerializer


class VehicleListCreateView(generics.ListCreateAPIView):
    serializer_class = VehicleSerializer

    def get_queryset(self):
        queryset = Vehicle.objects.select_related("customer")
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
