from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from customers.models import Customer
from purchases.models import Purchase, Supplier, UnitOfMeasure
from services.models import Service
from vehicles.models import Vehicle

from repairs.datafaker_demo import load_demo_payload, parse_decimal, with_marker
from repairs.models import Repair, RepairServiceLine


class Command(BaseCommand):
    help = "Import a Java Datafaker-generated CSP demo JSON scenario."

    def add_arguments(self, parser):
        parser.add_argument("json_path", help="Path to JSON emitted by tools/datafaker-generator")
        parser.add_argument(
            "--replace",
            action="store_true",
            help="Delete existing rows tagged with this dataset marker before importing.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        payload = load_demo_payload(options["json_path"])
        marker = payload.marker
        if options["replace"]:
            self._delete_marker(marker)

        users_by_email = self._upsert_users(payload.users)
        services_by_key = self._upsert_services(payload.services, marker)
        suppliers_by_key = self._upsert_suppliers(payload.suppliers, marker)
        customers_by_key = self._create_customers(payload.customers, marker)
        vehicles_by_key = self._create_vehicles(payload.vehicles, customers_by_key, marker)
        repairs_by_key = self._create_repairs(payload.repairs, vehicles_by_key, services_by_key, users_by_email, marker)
        self._create_purchases(payload.purchases, suppliers_by_key, vehicles_by_key, repairs_by_key)

        self.stdout.write(
            self.style.SUCCESS(
                "Imported Datafaker demo dataset "
                f"{marker}: {len(customers_by_key)} customers, {len(vehicles_by_key)} vehicles, "
                f"{len(repairs_by_key)} repairs, {len(payload.purchases)} purchases."
            )
        )

    def _delete_marker(self, marker: str) -> None:
        repairs = Repair.objects.filter(issue_notes__contains=f"[{marker}]")
        Purchase.objects.filter(invoice_name__startswith="DATAFAKER-DEMO-").delete()
        repairs.delete()
        Vehicle.objects.filter(notes__contains=f"[{marker}]").delete()
        Customer.objects.filter(notes__contains=f"[{marker}]").delete()
        Supplier.objects.filter(notes__contains=f"[{marker}]").delete()
        Service.objects.filter(description__contains=f"[{marker}]").delete()

    def _upsert_users(self, rows):
        User = get_user_model()
        users = {}
        for row in rows:
            email = row["email"]
            defaults = {
                "first_name": row.get("first_name", ""),
                "last_name": row.get("last_name", ""),
                "role": row.get("role", "staff"),
                "is_staff": bool(row.get("is_staff", False)),
            }
            user, created = User.objects.get_or_create(email=email, defaults=defaults)
            if created and row.get("password"):
                user.set_password(row["password"])
                user.save(update_fields=["password"])
            elif not created:
                for field, value in defaults.items():
                    setattr(user, field, value)
                user.save(update_fields=list(defaults))
            users[email] = user
        return users

    def _upsert_services(self, rows, marker: str):
        services = {}
        for row in rows:
            service, _ = Service.objects.update_or_create(
                name=row["name"],
                defaults={
                    "description": with_marker(row.get("description", ""), marker),
                    "price": parse_decimal(row.get("price"), field="price"),
                    "is_active": bool(row.get("is_active", True)),
                },
            )
            services[row["key"]] = service
        return services

    def _upsert_suppliers(self, rows, marker: str):
        suppliers = {}
        for row in rows:
            supplier, _ = Supplier.objects.update_or_create(
                name=row["name"],
                defaults={
                    "nip": row.get("nip", ""),
                    "phone": row.get("phone", ""),
                    "email": row.get("email", ""),
                    "registered_address": row.get("registered_address", ""),
                    "notes": with_marker(row.get("notes", ""), marker),
                },
            )
            suppliers[row["key"]] = supplier
        return suppliers

    def _create_customers(self, rows, marker: str):
        customers = {}
        for row in rows:
            customer = Customer.objects.create(
                full_name=row["full_name"],
                phone=row.get("phone", ""),
                email=row.get("email", ""),
                notes=with_marker(row.get("notes", ""), marker),
            )
            customers[row["key"]] = customer
        return customers

    def _create_vehicles(self, rows, customers_by_key, marker: str):
        vehicles = {}
        for row in rows:
            vehicle = Vehicle.objects.create(
                customer=customers_by_key[row["customer_key"]],
                license_plate=row["license_plate"],
                make=row["make"],
                model=row["model"],
                year=row.get("year"),
                vin=row.get("vin", ""),
                color=row.get("color", ""),
                mileage=row.get("mileage"),
                last_service_date=row.get("last_service_date"),
                added_date=row.get("added_date"),
                notes=with_marker(row.get("notes", ""), marker),
            )
            vehicles[row["key"]] = vehicle
        return vehicles

    def _create_repairs(self, rows, vehicles_by_key, services_by_key, users_by_email, marker: str):
        repairs = {}
        for row in rows:
            repair = Repair.objects.create(
                vehicle=vehicles_by_key[row["vehicle_key"]],
                master=users_by_email.get(row.get("master_email")),
                service_name=row["service_name"],
                issue_notes=with_marker(row.get("issue_notes", ""), marker),
                status=row.get("status", Repair.Status.NEW),
                mileage_at_service=row.get("mileage_at_service"),
                estimated_date=row.get("estimated_date"),
                completed_at=row.get("completed_at"),
            )
            service_keys = row.get("service_line_keys") or []
            for sort_order, service_key in enumerate(service_keys):
                service = services_by_key[service_key]
                RepairServiceLine.objects.create(
                    repair=repair,
                    name=service.name,
                    catalog_service=service,
                    sort_order=sort_order,
                )
            repairs[row["key"]] = repair
        return repairs

    def _create_purchases(self, rows, suppliers_by_key, vehicles_by_key, repairs_by_key):
        units = {unit.code: unit for unit in UnitOfMeasure.objects.all()}
        if "pcs" not in units:
            units["pcs"], _ = UnitOfMeasure.objects.get_or_create(code="pcs", defaults={"name": "Pieces", "sort_order": 10})
        for row in rows:
            repair = repairs_by_key.get(row.get("repair_key"))
            Purchase.objects.create(
                order_date=row["order_date"],
                approximate_delivery_date=row.get("approximate_delivery_date"),
                supplier=suppliers_by_key[row["supplier_key"]],
                vehicle=vehicles_by_key.get(row.get("vehicle_key")),
                unit_of_measure=units.get(row.get("uom_code", "pcs"), units["pcs"]),
                part_name=row["part_name"],
                quantity=parse_decimal(row.get("quantity", "1"), field="quantity"),
                current_stock_quantity=parse_decimal(row["current_stock_quantity"], field="current_stock_quantity")
                if row.get("current_stock_quantity") not in (None, "")
                else None,
                inventory_checked_on=row.get("inventory_checked_on"),
                purchase_price=parse_decimal(row.get("purchase_price"), field="purchase_price"),
                sale_price=parse_decimal(row.get("sale_price", "0"), field="sale_price"),
                repair_code=repair.tracking_code if repair else "",
                invoice_name=row.get("invoice_name", ""),
                invoice_url=row.get("invoice_url", ""),
                delivered=bool(row.get("delivered", False)),
                is_shop_consumable=bool(row.get("is_shop_consumable", False)),
            )
