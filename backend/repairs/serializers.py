from rest_framework import serializers

from users.models import User
from vehicles.models import Vehicle

from .models import Repair, RepairNote


class RepairNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairNote
        fields = ("id", "author_name", "author_email", "text", "created_at")
        read_only_fields = ("id", "author_name", "author_email", "created_at")


class RepairSerializer(serializers.ModelSerializer):
    vehicle_label = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    master_name = serializers.SerializerMethodField()
    repair_notes = RepairNoteSerializer(many=True, read_only=True, source="notes")
    before_photos = serializers.SerializerMethodField()
    during_photos = serializers.SerializerMethodField()
    after_photos = serializers.SerializerMethodField()
    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(), source="vehicle", write_only=True
    )
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
            "vehicle_id",
            "vehicle_label",
            "owner_name",
            "master_id",
            "master_name",
            "service_name",
            "issue_notes",
            "status",
            "tracking_code",
            "repair_notes",
            "before_photos",
            "during_photos",
            "after_photos",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "tracking_code", "created_at", "updated_at")

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

    def get_before_photos(self, obj):
        return []

    def get_during_photos(self, obj):
        return []

    def get_after_photos(self, obj):
        return []
