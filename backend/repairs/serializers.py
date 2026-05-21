from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError

from services.models import Service
from users.models import User
from vehicles.models import Vehicle

from .models import Repair, RepairNote, RepairServiceLine
from .service_lines_utils import sync_repair_service_name


class RepairNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairNote
        fields = ("id", "author_name", "author_email", "text", "created_at")
        read_only_fields = ("id", "author_name", "author_email", "created_at")


class RepairServiceLineSerializer(serializers.ModelSerializer):
    catalog_service_id = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.all(),
        source="catalog_service",
        allow_null=True,
        required=False,
    )
    catalog_service_price = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True, required=False, write_only=True)

    class Meta:
        model = RepairServiceLine
        fields = ("id", "name", "catalog_service_id", "catalog_service_price", "sort_order")
        read_only_fields = ("id",)

    def validate_name(self, value):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("Service name cannot be empty.")
        return v


class RepairSerializer(serializers.ModelSerializer):
    vehicle_label = serializers.SerializerMethodField()
    vehicle_plate = serializers.SerializerMethodField()
    vehicle_model = serializers.SerializerMethodField()
    vehicle_year = serializers.SerializerMethodField()
    mileage = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    master_name = serializers.SerializerMethodField()
    has_pdf = serializers.SerializerMethodField()
    repair_notes = RepairNoteSerializer(many=True, read_only=True, source="notes")
    before_photos = serializers.SerializerMethodField()
    during_photos = serializers.SerializerMethodField()
    after_photos = serializers.SerializerMethodField()
    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(), source="vehicle"
    )
    master_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="master",
        allow_null=True,
        required=False,
    )
    service_lines = RepairServiceLineSerializer(many=True, required=False)
    latest_act_document_total = serializers.SerializerMethodField()

    class Meta:
        model = Repair
        fields = (
            "id",
            "vehicle_id",
            "vehicle_label",
            "vehicle_plate",
            "vehicle_model",
            "vehicle_year",
            "mileage",
            "owner_name",
            "master_id",
            "master_name",
            "service_name",
            "service_lines",
            "issue_notes",
            "status",
            "mileage_at_service",
            "position",
            "tracking_code",
            "portal_token",
            "has_pdf",
            "latest_act_document_total",
            "started_at",
            "completed_at",
            "estimated_date",
            "repair_notes",
            "before_photos",
            "during_photos",
            "after_photos",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "tracking_code", "portal_token", "started_at", "created_at", "updated_at")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not data.get("service_lines") and instance.service_name:
            data["service_lines"] = [
                {"id": None, "name": instance.service_name, "catalog_service_id": None, "sort_order": 0}
            ]
        return data

    def get_vehicle_label(self, obj):
        v = obj.vehicle
        return f"{v.license_plate} • {v.make} {v.model}"

    def get_vehicle_plate(self, obj):
        v = obj.vehicle
        if v is None:
            return None
        return v.license_plate

    def get_vehicle_model(self, obj):
        v = obj.vehicle
        if v is None:
            return None
        return v.model

    def get_vehicle_year(self, obj):
        v = obj.vehicle
        if v is None:
            return None
        return v.year

    def get_mileage(self, obj):
        v = obj.vehicle
        if v is None:
            return None
        return v.mileage

    def get_owner_name(self, obj):
        return obj.vehicle.customer.full_name

    def get_master_name(self, obj):
        if not obj.master:
            return ""
        parts = [obj.master.first_name, obj.master.last_name]
        return " ".join(p for p in parts if p).strip() or obj.master.email

    def get_has_pdf(self, obj):
        annotated = getattr(obj, "has_pdf", None)
        if annotated is not None:
            return bool(annotated)
        return obj.documents.exists()

    def get_latest_act_document_total(self, obj):
        annotated = getattr(obj, "latest_act_document_total", None)
        if annotated is not None:
            return float(annotated)
        snap = (
            obj.financial_snapshots.select_related("document")
            .order_by("-document__version")
            .values_list("document_total", flat=True)
            .first()
        )
        return float(snap) if snap is not None else None

    def get_before_photos(self, obj):
        return []

    def get_during_photos(self, obj):
        return []

    def get_after_photos(self, obj):
        return []

    def validate(self, attrs):
        effective_status = attrs.get("status", getattr(self.instance, "status", None))
        effective_mileage = attrs.get(
            "mileage_at_service",
            getattr(self.instance, "mileage_at_service", None),
        )
        if effective_status == Repair.Status.COMPLETED and effective_mileage is None:
            raise serializers.ValidationError(
                {
                    "mileage_at_service": (
                        "Fill in Odometer when returned (km) before marking the repair as completed."
                    )
                }
            )
        return attrs

    @staticmethod
    def _can_edit_service_lines(request, repair) -> bool:
        if not request or not request.user.is_authenticated:
            return False
        if getattr(request.user, "role", None) == User.Role.ADMIN:
            return True
        if repair.master_id and repair.master_id == request.user.id:
            return True
        return False

    def _apply_service_lines(self, repair, lines_data: list | None, *, fallback_name: str = "") -> None:
        repair.service_lines.all().delete()
        if lines_data is not None:
            if len(lines_data) == 0:
                raise ValidationError({"service_lines": "At least one service line is required."})
            for i, line in enumerate(lines_data):
                catalog_service = line.get("catalog_service")
                line_name = line["name"].strip()
                if catalog_service is None:
                    catalog_service = Service.objects.filter(name__iexact=line_name).first()
                if catalog_service is None:
                    catalog_service_price = line.get("catalog_service_price")
                    if catalog_service_price is None:
                        raise ValidationError(
                            {"service_lines": f'Add a price for the new service "{line_name}".'}
                        )
                    catalog_service = Service.objects.create(
                        name=line_name,
                        price=catalog_service_price,
                        is_active=True,
                    )
                    line_name = catalog_service.name
                else:
                    line_name = catalog_service.name
                RepairServiceLine.objects.create(
                    repair=repair,
                    name=line_name,
                    catalog_service=catalog_service,
                    sort_order=line.get("sort_order", i),
                )
        else:
            fn = (fallback_name or "").strip()
            if not fn:
                raise ValidationError(
                    {"service_name": "Provide a service name or at least one entry in service_lines."}
                )
            RepairServiceLine.objects.create(repair=repair, name=fn, sort_order=0)

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop("service_lines", None)
        repair = Repair.objects.create(**validated_data)
        fallback = (repair.service_name or "").strip()
        try:
            self._apply_service_lines(repair, lines_data, fallback_name=fallback)
        except ValidationError:
            repair.delete()
            raise
        sync_repair_service_name(repair.pk)
        repair.refresh_from_db()
        return repair

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get("request")
        lines_data = validated_data.pop("service_lines", serializers.empty)
        repair = super().update(instance, validated_data)
        if lines_data is not serializers.empty:
            if not self._can_edit_service_lines(request, repair):
                raise PermissionDenied("Only the assigned master or an admin can edit services.")
            self._apply_service_lines(repair, lines_data, fallback_name="")
            sync_repair_service_name(repair.pk)
            repair.refresh_from_db()
        return repair


class PortalRepairSerializer(serializers.ModelSerializer):
    vehicle_info = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    service_lines = serializers.SerializerMethodField()

    class Meta:
        model = Repair
        fields = (
            "tracking_code",
            "service_name",
            "service_lines",
            "status",
            "status_display",
            "vehicle_info",
            "estimated_date",
            "mileage_at_service",
            "completed_at",
            "created_at",
        )
        read_only_fields = fields

    def get_service_lines(self, obj: Repair) -> list[dict]:
        lines = list(obj.service_lines.order_by("sort_order", "id"))
        if lines:
            return [{"name": ln.name, "catalog_service_id": ln.catalog_service_id} for ln in lines]
        if obj.service_name:
            return [{"name": obj.service_name, "catalog_service_id": None}]
        return []

    def get_vehicle_info(self, obj: Repair) -> dict:
        v = obj.vehicle
        return {
            "label": f"{v.make} {v.model}",
            "year": v.year,
            "license_plate": v.license_plate,
        }

    def get_status_display(self, obj: Repair) -> str:
        return obj.get_status_display()


class VehicleRepairHistorySerializer(serializers.ModelSerializer):
    master_name = serializers.SerializerMethodField()
    service_lines = serializers.SerializerMethodField()

    class Meta:
        model = Repair
        fields = (
            "id",
            "tracking_code",
            "service_name",
            "service_lines",
            "issue_notes",
            "status",
            "mileage_at_service",
            "completed_at",
            "created_at",
            "master_name",
        )
        read_only_fields = fields

    def get_service_lines(self, obj: Repair) -> list[dict]:
        lines = list(obj.service_lines.order_by("sort_order", "id"))
        if lines:
            return [{"name": ln.name} for ln in lines]
        if obj.service_name:
            return [{"name": obj.service_name}]
        return []

    def get_master_name(self, obj):
        if not obj.master:
            return ""
        parts = [obj.master.first_name, obj.master.last_name]
        return " ".join(p for p in parts if p).strip()
