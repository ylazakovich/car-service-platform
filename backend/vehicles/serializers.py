from rest_framework import serializers

from customers.models import Customer
from .models import Vehicle


class VehicleCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("id", "full_name")


class VehicleSerializer(serializers.ModelSerializer):
    customer = VehicleCustomerSerializer(read_only=True)
    customer_id = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all(), source="customer", write_only=True)

    class Meta:
        model = Vehicle
        fields = (
            "id",
            "customer",
            "customer_id",
            "license_plate",
            "make",
            "model",
            "year",
            "vin",
            "color",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "customer", "created_at", "updated_at")
