from decimal import Decimal

from rest_framework import serializers

from vehicles.models import Vehicle

from .models import Purchase, Supplier, UnitOfMeasure

MAX_PURCHASE_BULK_LINES = 100


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ("id", "name", "nip", "phone", "email", "registered_address", "notes", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class UnitOfMeasureSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitOfMeasure
        fields = ("id", "code", "name", "is_active", "sort_order", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")
        extra_kwargs = {"sort_order": {"required": False}}

    def create(self, validated_data):
        if "sort_order" not in validated_data:
            from django.db.models import Max

            m = UnitOfMeasure.objects.aggregate(mx=Max("sort_order"))["mx"]
            validated_data["sort_order"] = 0 if m is None else m + 1
        return super().create(validated_data)


class UnitOfMeasureReorderSerializer(serializers.Serializer):
    order = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)


def default_pcs_unit() -> UnitOfMeasure:
    u = UnitOfMeasure.objects.filter(code="pcs", is_active=True).first()
    if u is None:
        raise serializers.ValidationError(
            {"unit_of_measure_id": "Default unit of measure (pcs) is missing; run migrations."}
        )
    return u


class PurchaseSerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)
    supplier_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    current_stock_quantity = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0"), required=False
    )
    unit_of_measure = UnitOfMeasureSerializer(read_only=True)
    unit_of_measure_id = serializers.PrimaryKeyRelatedField(
        queryset=UnitOfMeasure.objects.filter(is_active=True),
        source="unit_of_measure",
        write_only=True,
        required=False,
    )
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
            "unit_of_measure",
            "unit_of_measure_id",
            "part_name",
            "quantity",
            "current_stock_quantity",
            "purchase_price",
            "sale_price",
            "repair_code",
            "invoice_name",
            "invoice_url",
            "delivered",
            "is_shop_consumable",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def _resolve_supplier(self, validated_data):
        supplier_name = validated_data.pop("supplier_name", None)
        if supplier_name and "supplier" not in validated_data:
            supplier, _ = Supplier.objects.get_or_create(name=supplier_name)
            validated_data["supplier"] = supplier

    def _ensure_unit_of_measure(self, validated_data):
        if validated_data.get("unit_of_measure") is None:
            validated_data["unit_of_measure"] = default_pcs_unit()

    def create(self, validated_data):
        self._resolve_supplier(validated_data)
        self._ensure_unit_of_measure(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._resolve_supplier(validated_data)
        if "unit_of_measure" in validated_data and validated_data["unit_of_measure"] is None:
            validated_data["unit_of_measure"] = default_pcs_unit()
        return super().update(instance, validated_data)


class PurchaseBulkLineSerializer(serializers.Serializer):
    part_name = serializers.CharField(max_length=255)
    quantity = serializers.IntegerField(min_value=1)
    purchase_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    sale_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=0, required=False, default=0
    )
    repair_code = serializers.CharField(max_length=32, allow_blank=True, required=False, default="")
    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(),
        source="vehicle",
        allow_null=True,
        required=False,
    )
    unit_of_measure_id = serializers.PrimaryKeyRelatedField(
        queryset=UnitOfMeasure.objects.filter(is_active=True),
        source="unit_of_measure",
        allow_null=True,
        required=False,
    )

    def validate_part_name(self, value):
        text = (value or "").strip()
        if not text:
            raise serializers.ValidationError("Part name is required.")
        return text


class PurchaseBulkCreateSerializer(serializers.Serializer):
    """Validates a shared invoice header and multiple purchase lines (one DB row per line)."""

    order_date = serializers.DateField()
    approximate_delivery_date = serializers.DateField(required=False, allow_null=True)
    supplier_name = serializers.CharField(max_length=255)
    invoice_name = serializers.CharField(max_length=255, allow_blank=True, required=False, default="")
    invoice_url = serializers.CharField(max_length=500, allow_blank=True, required=False, default="")
    delivered = serializers.BooleanField(required=False, default=False)
    is_shop_consumable = serializers.BooleanField(required=False, default=False)
    lines = PurchaseBulkLineSerializer(many=True)

    def validate_supplier_name(self, value):
        text = (value or "").strip()
        if not text:
            raise serializers.ValidationError("Supplier name is required.")
        return text

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError("At least one line is required.")
        if len(value) > MAX_PURCHASE_BULK_LINES:
            raise serializers.ValidationError(f"At most {MAX_PURCHASE_BULK_LINES} lines per request.")
        return value

    def validate(self, attrs):
        if attrs.get("is_shop_consumable"):
            for i, line in enumerate(attrs["lines"]):
                if line.get("vehicle") is not None or (line.get("repair_code") or "").strip():
                    raise serializers.ValidationError(
                        {
                            "lines": f"Line {i + 1}: shop consumables cannot include vehicle or repair links.",
                        }
                    )
        return attrs


class PurchaseOrderLineSerializer(serializers.Serializer):
    part_name = serializers.CharField(max_length=255)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    purchase_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0"))
    unit_of_measure_id = serializers.PrimaryKeyRelatedField(
        queryset=UnitOfMeasure.objects.filter(is_active=True),
        source="unit_of_measure",
        allow_null=True,
        required=False,
    )

    def validate_part_name(self, value):
        text = (value or "").strip()
        if not text:
            raise serializers.ValidationError("Part name is required.")
        return text


class PurchaseOrderPdfSerializer(serializers.Serializer):
    order_date = serializers.DateField()
    approximate_delivery_date = serializers.DateField(required=False, allow_null=True)
    supplier_name = serializers.CharField(max_length=255)
    is_shop_consumable = serializers.BooleanField(required=False, default=False)
    lines = PurchaseOrderLineSerializer(many=True)

    def validate_supplier_name(self, value):
        text = (value or "").strip()
        if not text:
            raise serializers.ValidationError("Supplier name is required.")
        return text

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError("At least one line is required.")
        if len(value) > MAX_PURCHASE_BULK_LINES:
            raise serializers.ValidationError(f"At most {MAX_PURCHASE_BULK_LINES} lines per PO.")
        return value
