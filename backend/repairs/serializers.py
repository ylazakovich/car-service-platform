from rest_framework import serializers

from users.models import User
from vehicles.models import Vehicle

from .models import Repair, RepairNote, RepairVisit


def aggregate_visit_status(tasks: list[Repair]) -> str:
    """Roll up child task statuses for portal / summary (operational, not persisted)."""
    if not tasks:
        return Repair.Status.NEW
    statuses = [t.status for t in tasks]
    if all(s == Repair.Status.COMPLETED for s in statuses):
        return Repair.Status.COMPLETED
    if Repair.Status.IN_PROGRESS in statuses:
        return Repair.Status.IN_PROGRESS
    if Repair.Status.WAITING_PARTS in statuses:
        return Repair.Status.WAITING_PARTS
    if Repair.Status.COMPLETED in statuses and Repair.Status.NEW in statuses:
        return Repair.Status.IN_PROGRESS
    return Repair.Status.NEW


class RepairNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairNote
        fields = ("id", "author_name", "author_email", "text", "created_at")
        read_only_fields = ("id", "author_name", "author_email", "text", "created_at")


class RepairSerializer(serializers.ModelSerializer):
    vehicle_label = serializers.SerializerMethodField()
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
    visit_id = serializers.PrimaryKeyRelatedField(
        queryset=RepairVisit.objects.all(),
        source="visit",
        required=False,
        allow_null=True,
    )
    tracking_code = serializers.SerializerMethodField()
    portal_token = serializers.SerializerMethodField()
    master_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="master",
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Repair
        fields = (
            "id",
            "visit_id",
            "vehicle_id",
            "vehicle_label",
            "owner_name",
            "master_id",
            "master_name",
            "service_name",
            "issue_notes",
            "status",
            "mileage_at_service",
            "position",
            "tracking_code",
            "portal_token",
            "has_pdf",
            "completed_at",
            "estimated_date",
            "repair_notes",
            "before_photos",
            "during_photos",
            "after_photos",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "tracking_code", "portal_token", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None:
            self.fields["visit_id"].read_only = True

    def get_tracking_code(self, obj: Repair) -> str:
        return obj.visit.tracking_code

    def get_portal_token(self, obj: Repair) -> str:
        return obj.visit.portal_token

    def get_vehicle_label(self, obj):
        v = obj.vehicle
        return f"{v.license_plate} • {v.make} {v.model}"

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
        return obj.visit.documents.exists()

    def get_before_photos(self, obj):
        return []

    def get_during_photos(self, obj):
        return []

    def get_after_photos(self, obj):
        return []

    def create(self, validated_data):
        visit = validated_data.pop("visit", None)
        vehicle = validated_data.pop("vehicle")
        if visit is None:
            v = RepairVisit.objects.create(vehicle=vehicle)
            v.save()
            visit = v
        elif visit.vehicle_id != vehicle.pk:
            raise serializers.ValidationError({"visit_id": "Visit belongs to a different vehicle."})
        return Repair.objects.create(visit=visit, vehicle=vehicle, **validated_data)


class PortalRepairSerializer(serializers.BaseSerializer):
    """Public portal payload for a RepairVisit (one token → one visit, many tasks)."""

    def to_representation(self, visit: RepairVisit) -> dict:
        tasks = list(visit.repairs.all().order_by("id"))
        agg = aggregate_visit_status(tasks)
        service_name = ", ".join(t.service_name for t in tasks) if tasks else "—"
        est_dates = [t.estimated_date for t in tasks if t.estimated_date]
        estimated_date = max(est_dates) if est_dates else None
        mileage = next((t.mileage_at_service for t in tasks if t.mileage_at_service is not None), None)
        v = visit.vehicle
        return {
            "tracking_code": visit.tracking_code,
            "service_name": service_name,
            "status": agg,
            "status_display": dict(Repair.Status.choices).get(agg, agg),
            "vehicle_info": {
                "label": f"{v.make} {v.model}",
                "year": v.year,
                "license_plate": v.license_plate,
            },
            "estimated_date": estimated_date.isoformat() if estimated_date else None,
            "mileage_at_service": mileage,
            "completed_at": visit.completed_at.isoformat() if visit.completed_at else None,
            "created_at": visit.created_at.isoformat(),
            "tasks": [
                {
                    "id": t.id,
                    "service_name": t.service_name,
                    "status": t.status,
                    "status_display": t.get_status_display(),
                }
                for t in tasks
            ],
        }


class VehicleRepairHistorySerializer(serializers.ModelSerializer):
    master_name = serializers.SerializerMethodField()
    tracking_code = serializers.CharField(read_only=True, source="visit.tracking_code")

    class Meta:
        model = Repair
        fields = (
            "id",
            "tracking_code",
            "service_name",
            "issue_notes",
            "status",
            "mileage_at_service",
            "completed_at",
            "created_at",
            "master_name",
        )
        read_only_fields = fields

    def get_master_name(self, obj):
        if not obj.master:
            return ""
        parts = [obj.master.first_name, obj.master.last_name]
        return " ".join(p for p in parts if p).strip()
