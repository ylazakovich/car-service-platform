from decimal import Decimal

from rest_framework import serializers

from vehicles.models import Vehicle

from .models import InvoiceLineParseTemplate, Purchase, Supplier, SupplierAlias, UnitOfMeasure, supplier_alias_normalize
from .invoice_line_parse import REQUIRED_REGEX_GROUPS, SUPPLIER_REGEX_GROUP, compile_line_pattern, compile_pattern_or_raise

MAX_PURCHASE_BULK_LINES = 100


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ("id", "name", "nip", "phone", "email", "registered_address", "notes", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class SupplierAliasSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierAlias
        fields = ("id", "supplier", "alias_text", "normalized_key", "created_at")
        read_only_fields = ("id", "supplier", "normalized_key", "created_at")

    def validate_alias_text(self, value):
        text = (value or "").strip()
        if not text:
            raise serializers.ValidationError("alias_text is required.")
        return text

    def validate(self, attrs):
        key = supplier_alias_normalize(attrs["alias_text"])
        qs = SupplierAlias.objects.filter(normalized_key=key)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({"alias_text": "This alias already maps to a supplier."})
        return attrs


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


def quantity_requires_whole_units(unit: UnitOfMeasure | None) -> bool:
    return unit is None or unit.code.strip().lower() == "pcs"


def validate_quantity_precision(quantity: Decimal, unit: UnitOfMeasure | None, field_name: str = "quantity") -> None:
    if quantity_requires_whole_units(unit) and quantity != quantity.to_integral_value():
        raise serializers.ValidationError(
            {
                field_name: "This unit only allows whole quantities.",
            }
        )


class PurchaseSerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)
    supplier_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    quantity = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0.01"), coerce_to_string=False
    )
    current_stock_quantity = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0"), required=False, allow_null=True
    )
    inventory_checked_on = serializers.DateField(required=False, allow_null=True)
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
            "inventory_checked_on",
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

    def validate(self, attrs):
        quantity = attrs.get("quantity", getattr(self.instance, "quantity", None))
        unit_of_measure = attrs.get("unit_of_measure", getattr(self.instance, "unit_of_measure", None))
        current_stock_quantity = attrs.get(
            "current_stock_quantity", getattr(self.instance, "current_stock_quantity", None)
        )
        inventory_checked_on = attrs.get(
            "inventory_checked_on", getattr(self.instance, "inventory_checked_on", None)
        )

        has_inventory_snapshot = current_stock_quantity is not None or inventory_checked_on is not None
        missing_snapshot_value = current_stock_quantity is None or inventory_checked_on is None

        if has_inventory_snapshot and missing_snapshot_value:
            raise serializers.ValidationError(
                {
                    "current_stock_quantity": "Inventory snapshot requires both date and quantity.",
                    "inventory_checked_on": "Inventory snapshot requires both date and quantity.",
                }
            )

        if quantity is not None:
            validate_quantity_precision(Decimal(quantity), unit_of_measure, "quantity")

        if quantity is not None and current_stock_quantity is not None:
            max_stock_quantity = Decimal(quantity)
            if current_stock_quantity > max_stock_quantity:
                raise serializers.ValidationError(
                    {
                        "current_stock_quantity": "Inventory cannot exceed the purchased quantity.",
                    }
                )

        return attrs

    def create(self, validated_data):
        self._resolve_supplier(validated_data)
        self._ensure_unit_of_measure(validated_data)
        if validated_data.get("is_shop_consumable"):
            validated_data.setdefault("current_stock_quantity", None)
            validated_data.setdefault("inventory_checked_on", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._resolve_supplier(validated_data)
        if "unit_of_measure" in validated_data and validated_data["unit_of_measure"] is None:
            validated_data["unit_of_measure"] = default_pcs_unit()
        return super().update(instance, validated_data)


class PurchaseBulkLineSerializer(serializers.Serializer):
    part_name = serializers.CharField(max_length=255)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"), coerce_to_string=False)
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

    def validate(self, attrs):
        unit = attrs.get("unit_of_measure") or default_pcs_unit()
        validate_quantity_precision(attrs["quantity"], unit, "quantity")
        return attrs


class PurchaseBulkCreateSerializer(serializers.Serializer):
    """Validates a shared invoice header and multiple purchase lines (one DB row per line)."""

    order_date = serializers.DateField()
    approximate_delivery_date = serializers.DateField(required=False, allow_null=True)
    supplier_name = serializers.CharField(max_length=255)
    supplier_nip = serializers.CharField(max_length=50, allow_blank=True, required=False, default="")
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
    quantity = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0.01"), coerce_to_string=False
    )
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

    def validate(self, attrs):
        unit = attrs.get("unit_of_measure") or default_pcs_unit()
        validate_quantity_precision(attrs["quantity"], unit, "quantity")
        return attrs


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


class InvoiceLineParseTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineParseTemplate
        fields = (
            "id",
            "name",
            "description",
            "line_pattern",
            "supplier_pattern",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_supplier_pattern(self, value):
        text = (value or "").strip()
        if not text:
            return ""
        try:
            rx = compile_pattern_or_raise(text)
        except ValueError as exc:
            raise serializers.ValidationError("Invalid supplier regex pattern.") from exc
        if SUPPLIER_REGEX_GROUP not in rx.groupindex:
            raise serializers.ValidationError(
                f"Supplier regex must define named group (?P<{SUPPLIER_REGEX_GROUP}>…)."
            )
        return text

    def validate_line_pattern(self, value):
        text = (value or "").strip()
        if not text:
            raise serializers.ValidationError("line_pattern is required.")
        try:
            rx = compile_line_pattern(text)
        except ValueError as exc:
            raise serializers.ValidationError("Invalid line regex pattern.") from exc
        names = frozenset(rx.groupindex.keys())
        missing = REQUIRED_REGEX_GROUPS - names
        if missing:
            raise serializers.ValidationError(
                f"Regex must define named groups: {', '.join(sorted(REQUIRED_REGEX_GROUPS))}. "
                f"Missing: {', '.join(sorted(missing))}."
            )
        return text


class InvoiceParseExtractSerializer(serializers.Serializer):
    file = serializers.FileField()


class InvoiceParseSuggestSerializer(serializers.Serializer):
    raw_text = serializers.CharField(required=False, allow_blank=True, default="")
    file = serializers.FileField(required=False)

    def validate(self, attrs):
        raw = (attrs.get("raw_text") or "").strip()
        file = attrs.get("file")
        if not raw and not file:
            raise serializers.ValidationError("Provide raw_text and/or file.")
        return attrs


class InvoiceParsePreviewSerializer(serializers.Serializer):
    raw_text = serializers.CharField(required=False, allow_blank=True, default="")
    line_pattern = serializers.CharField(required=False, allow_blank=True, default="")
    supplier_pattern = serializers.CharField(required=False, allow_blank=True, default="")
    template_id = serializers.IntegerField(required=False, allow_null=True)
    file = serializers.FileField(required=False)

    def validate(self, attrs):
        raw = (attrs.get("raw_text") or "").strip()
        file = attrs.get("file")
        if not raw and not file:
            raise serializers.ValidationError("Provide raw_text and/or file.")

        tid = attrs.get("template_id")
        pattern = (attrs.get("line_pattern") or "").strip()
        if tid is None and not pattern:
            raise serializers.ValidationError("Provide template_id or line_pattern.")
        if tid is not None and pattern:
            raise serializers.ValidationError("Use either template_id or line_pattern, not both.")
        return attrs
