from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from repairs.models import Repair, RepairDocument
from repairs.pdf_export import export_repair_pdf_and_snapshot


DEFAULT_TRACKING_CODES = ("TOR-2001",)
E2E_EXPORTER_EMAIL = "admin@autoservice.local"


class Command(BaseCommand):
    help = "Create deterministic pre-exported repair PDF documents for E2E demo fixtures."

    def add_arguments(self, parser):
        parser.add_argument(
            "tracking_codes",
            nargs="*",
            default=DEFAULT_TRACKING_CODES,
            help="Repair tracking codes to seed with an initial PDF document.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        tracking_codes = tuple(options.get("tracking_codes") or DEFAULT_TRACKING_CODES)
        User = get_user_model()
        exporter, _created = User.objects.get_or_create(
            email=E2E_EXPORTER_EMAIL,
            defaults={
                "first_name": "E2E",
                "last_name": "Exporter",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )

        created = 0
        skipped = 0
        missing = []

        for tracking_code in tracking_codes:
            repair = Repair.objects.filter(tracking_code=tracking_code).first()
            if repair is None:
                missing.append(tracking_code)
                continue
            if RepairDocument.objects.filter(repair=repair).exists():
                skipped += 1
                self.stdout.write(f"Skipped {tracking_code}: PDF document already exists.")
                continue
            if repair.status != Repair.Status.COMPLETED:
                skipped += 1
                self.stdout.write(f"Skipped {tracking_code}: repair is not completed.")
                continue
            if repair.mileage_at_service is None:
                skipped += 1
                self.stdout.write(f"Skipped {tracking_code}: mileage_at_service is empty.")
                continue

            _pdf_bytes, doc = export_repair_pdf_and_snapshot(repair, exporter)
            created += 1
            self.stdout.write(f"Created {tracking_code} PDF document v{doc.version}.")

        for tracking_code in missing:
            self.stdout.write(self.style.WARNING(f"Missing {tracking_code}: no repair found."))

        self.stdout.write(
            self.style.SUCCESS(
                f"E2E PDF seed complete: created={created}, skipped={skipped}, missing={len(missing)}."
            )
        )
