from django.db.models import Count, ProtectedError, Q
from rest_framework import status
from rest_framework import generics
from rest_framework.response import Response

from .models import Customer
from .serializers import CustomerSerializer


class CustomerListCreateView(generics.ListCreateAPIView):
    serializer_class = CustomerSerializer

    def get_queryset(self):
        queryset = Customer.objects.annotate(vehicle_count=Count("vehicles"))
        query = self.request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(
                Q(full_name__icontains=query)
                | Q(phone__icontains=query)
                | Q(email__icontains=query)
            )
        return queryset


class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer

    def get_queryset(self):
        return Customer.objects.annotate(vehicle_count=Count("vehicles"))

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Delete vehicles assigned to this customer before deleting the customer."},
                status=status.HTTP_409_CONFLICT,
            )
