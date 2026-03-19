from django.db.models import Count, ProtectedError, Q
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Customer
from .serializers import CustomerSerializer


class CustomerListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerSerializer

    def get_queryset(self):
        if self.request.user.role == "admin":
            queryset = Customer.objects.annotate(vehicle_count=Count("vehicles")).order_by("full_name")
        else:
            queryset = Customer.objects.filter(assigned_to=self.request.user).annotate(vehicle_count=Count("vehicles")).order_by("full_name")
        query = self.request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(
                Q(full_name__icontains=query)
                | Q(phone__icontains=query)
                | Q(email__icontains=query)
            )
        return queryset

    def perform_create(self, serializer):
        assigned_to = self.request.user if self.request.user.role == "staff" else None
        serializer.save(assigned_to=assigned_to)


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer

    def get_queryset(self):
        return Customer.objects.annotate(vehicle_count=Count("vehicles"))

    def get_object(self):
        obj = super().get_object()
        if self.request.user.role == "staff" and obj.assigned_to != self.request.user:
            raise PermissionDenied
        return obj

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Delete vehicles assigned to this customer before deleting the customer."},
                status=status.HTTP_409_CONFLICT,
            )
