from rest_framework import serializers

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    vehicle_count = serializers.IntegerField(read_only=True)
    assigned_to = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Customer
        fields = (
            "id",
            "full_name",
            "phone",
            "email",
            "notes",
            "assigned_to",
            "vehicle_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "assigned_to", "vehicle_count", "created_at", "updated_at")
