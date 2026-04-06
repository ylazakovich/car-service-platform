from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from foundation.pagination import StandardPagination
from customers.models import Customer
from repairs.models import Repair
from repairs.serializers import VehicleRepairHistorySerializer
from .models import Vehicle
from .serializers import VehicleSerializer


class VehicleListCreateView(generics.ListCreateAPIView):
    serializer_class = VehicleSerializer
    pagination_class = StandardPagination

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

    def perform_create(self, serializer):
        if self.request.user.role == "staff":
            customer = serializer.validated_data.get("customer")
            if customer.assigned_to != self.request.user:
                raise PermissionDenied
        serializer.save()


class VehicleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = VehicleSerializer

    def get_queryset(self):
        return Vehicle.objects.select_related("customer")

    def get_object(self):
        obj = super().get_object()
        if self.request.user.role == "staff" and obj.customer.assigned_to != self.request.user:
            raise PermissionDenied
        return obj

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.purchases.exists():
            return Response(
                {"detail": "Reassign or delete linked purchases before deleting this vehicle."},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)


class VehicleRepairHistoryView(generics.ListAPIView):
    serializer_class = VehicleRepairHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        get_object_or_404(Vehicle, pk=self.kwargs["pk"])
        return (
            Repair.objects.select_related("master", "visit")
            .filter(vehicle_id=self.kwargs["pk"])
            .order_by("-created_at")
        )
