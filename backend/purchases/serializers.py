from rest_framework import serializers

from vehicles.models import Vehicle

from .models import Purchase, Supplier


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ("id", "name", "nip", "phone", "email", "notes", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class PurchaseSerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)
    supplier_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        source="vehicle",
        write_only=True,
        allow_null=True,
        required=False,
    )
    vehicle_license_plate = serializers.SerializerMethodField()

    def get_vehicle_license_plate(self, obj):
        if obj.vehicle:
            return obj.vehicle.license_plate
        return ""

    class Meta:
        model = Purchase
        fields = (
            "id",
            "order_date",
            "approximate_delivery_date",
            "supplier",
            "supplier_name",
            "vehicle",
            "vehicle_id",
            "vehicle_license_plate",
            "part_name",
            "quantity",
            "purchase_price",
            "sale_price",
            "repair_code",
            "invoice_name",
            "invoice_url",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def _resolve_supplier(self, validated_data):
        supplier_name = validated_data.pop("supplier_name", None)
        if supplier_name and "supplier" not in validated_data:
            supplier, _ = Supplier.objects.get_or_create(name=supplier_name)
            validated_data["supplier"] = supplier

    def create(self, validated_data):
        self._resolve_supplier(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._resolve_supplier(validated_data)
        return super().update(instance, validated_data)
