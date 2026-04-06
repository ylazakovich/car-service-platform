from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from customers.models import Customer
from repairs.models import Repair, RepairVisit
from vehicles.models import Vehicle

User = get_user_model()


class Command(BaseCommand):
    help = "Idempotent minimal completed repair for Playwright E2E (skipped if one already exists)."

    def handle(self, *args, **options):
        if Repair.objects.filter(status=Repair.Status.COMPLETED).exists():
            self.stdout.write("Completed repair already present; skip seed_e2e_data.")
            return

        master = User.objects.filter(role=User.Role.STAFF).first() or User.objects.filter(
            role=User.Role.ADMIN
        ).first()
        if not master:
            self.stdout.write("No staff/admin user; skip seed_e2e_data.")
            return

        customer = Customer.objects.create(
            full_name="E2E Demo Customer",
            phone="+10000000001",
            email="e2e-demo@example.com",
        )
        vehicle = Vehicle.objects.create(
            customer=customer,
            license_plate="E2E-CI-001",
            make="Demo",
            model="Sedan",
            year=2022,
            vin="E2EVINCI00000001",
        )
        visit = RepairVisit.objects.create(vehicle=vehicle)
        visit.save()
        Repair.objects.create(
            visit=visit,
            vehicle=vehicle,
            master=master,
            service_name="E2E completed service",
            issue_notes="Seeded for CI Playwright",
            status=Repair.Status.COMPLETED,
            mileage_at_service=50_000,
        )
        self.stdout.write(self.style.SUCCESS("Created E2E completed repair (TOR-* after save)."))
