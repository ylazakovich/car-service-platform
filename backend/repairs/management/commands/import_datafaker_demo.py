from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from customers.models import Customer
from purchases.models import Purchase, Supplier, UnitOfMeasure
from services.models import Service
from vehicles.models import Vehicle

from repairs.datafaker_demo import load_demo_payload, parse_decimal, with_marker
from repairs.models import Repair, RepairServiceLine
from repairs.pdf_export import export_repair_pdf_and_snapshot


class Command(BaseCommand):
    help = "Import a Java Datafaker-generated CSP demo JSON scenario."

    LEGACY_DEMO_CUSTOMER_PHONES = (
        "+380****4567",
        "+380****5678",
        "+380****6789",
        "+380****2233",
        "+380****3344",
        "+380****4455",
        "+380****5566",
        "+380****6677",
        "+380****7788",
        "+380****8899",
    )

    LEGACY_DEMO_VEHICLE_PLATES = (
        "AA 1234 BB",
        "AA 9876 CC",
        "KA 4321 EE",
        "BH 5566 FF",
        "BH 7788 GG",
        "AA 2233 HH",
        "AA 4455 KK",
        "KA 8899 MM",
        "BH 1122 PP",
        "BH 3344 RR",
        "AA 6677 SS",
        "KA 9900 TT",
        "KA 1357 UU",
        "AA 2468 VV",
        "BH 9876 WW",
        "BH 1111 XX",
    )

    def add_arguments(self, parser):
        """
        Register command-line arguments required by the import_datafaker_demo management command.
        
        Adds:
        - `json_path`: positional path to the Datafaker-generated JSON file.
        - `--replace`: optional flag to delete existing rows tagged with the dataset marker before import.
        - `--replace-legacy-sql-demo`: optional flag to delete rows originating from the legacy demo SQL fixture before import.
        
        Parameters:
            parser (argparse.ArgumentParser): The argument parser to which these options are added.
        """
        parser.add_argument("json_path", help="Path to JSON emitted by tools/datafaker-generator")
        parser.add_argument(
            "--replace",
            action="store_true",
            help="Delete existing rows tagged with this dataset marker before importing.",
        )
        parser.add_argument(
            "--replace-legacy-sql-demo",
            action="store_true",
            help="Delete rows from the former scripts/demo/demo_data.sql fixture before importing.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        """
        Import a Datafaker demo JSON payload into the database, optionally removing prior demo data.
        
        Parameters:
            *args: Positional arguments passed by Django's management command infrastructure (ignored).
            **options (dict): Command-line options; recognized keys:
                json_path (str): Path to the Datafaker JSON file to load.
                replace (bool): If true, delete existing records tagged with the payload marker before importing.
                replace_legacy_sql_demo (bool): If true, delete rows originating from the legacy SQL demo fixture before importing.
        
        Description:
            Loads the demo payload, optionally purges legacy or marker-tagged demo records, and then upserts/creates
            users, services, suppliers, customers, vehicles, repairs (including service lines), and purchases,
            wiring relationships according to keys in the payload. Writes a success message summarizing counts.
        
        Side effects:
            Performs database inserts, updates, and deletions.
        """
        payload = load_demo_payload(options["json_path"])
        marker = payload.marker
        if options["replace_legacy_sql_demo"]:
            self._delete_legacy_sql_demo()
        if options["replace"]:
            self._delete_marker(marker)

        users_by_email = self._upsert_users(payload.users)
        services_by_key = self._upsert_services(payload.services, marker)
        suppliers_by_key = self._upsert_suppliers(payload.suppliers, marker)
        customers_by_key = self._create_customers(payload.customers, marker, users_by_email)
        vehicles_by_key = self._create_vehicles(payload.vehicles, customers_by_key, marker)
        repairs_by_key = self._create_repairs(payload.repairs, vehicles_by_key, services_by_key, users_by_email, marker)
        self._create_purchases(payload.purchases, suppliers_by_key, vehicles_by_key, repairs_by_key)
        prepared_acts = self._prepare_completed_repair_acts(repairs_by_key, users_by_email)

        self.stdout.write(
            self.style.SUCCESS(
                "Imported Datafaker demo dataset "
                f"{marker}: {len(customers_by_key)} customers, {len(vehicles_by_key)} vehicles, "
                f"{len(repairs_by_key)} repairs, {len(payload.purchases)} purchases, "
                f"{prepared_acts} prepared acts."
            )
        )

    def _delete_marker(self, marker: str) -> None:
        """
        Remove database records that were tagged with the dataset marker.
        
        Deletes Repair rows whose `issue_notes` contain `"[{marker}]"`, Purchase rows whose `invoice_name` starts with `"DATAFAKER-DEMO-"`, and Vehicle, Customer, Supplier, and Service rows whose relevant text fields contain the marker. Purchases are removed before associated repairs to avoid foreign-key/order conflicts.
        
        Parameters:
            marker (str): Marker string used to identify demo records (the function matches `"[{marker}]"` in text fields).
        """
        repairs = Repair.objects.filter(issue_notes__contains=f"[{marker}]")
        Purchase.objects.filter(repair_code__in=repairs.values_list("tracking_code", flat=True)).delete()
        repairs.delete()
        Vehicle.objects.filter(notes__contains=f"[{marker}]").delete()
        Customer.objects.filter(notes__contains=f"[{marker}]").delete()
        Supplier.objects.filter(notes__contains=f"[{marker}]").delete()
        Service.objects.filter(description__contains=f"[{marker}]").delete()

    def _delete_legacy_sql_demo(self) -> None:
        """
        Remove rows that originate from the legacy SQL demo fixture using hardcoded legacy identifiers.
        
        Deletes Purchase rows linked to legacy vehicle IDs or legacy repair tracking codes, deletes the corresponding Repair and Vehicle rows identified by the legacy license plates, and deletes Customer rows whose phone matches the legacy demo phone patterns.
        """
        legacy_vehicle_ids = Vehicle.objects.filter(license_plate__in=self.LEGACY_DEMO_VEHICLE_PLATES).values_list("id", flat=True)
        legacy_repair_ids = Repair.objects.filter(vehicle_id__in=legacy_vehicle_ids).values_list("id", flat=True)
        legacy_tracking_codes = Repair.objects.filter(id__in=legacy_repair_ids).values_list("tracking_code", flat=True)
        Purchase.objects.filter(vehicle_id__in=legacy_vehicle_ids).delete()
        Purchase.objects.filter(repair_code__in=legacy_tracking_codes).delete()
        Repair.objects.filter(id__in=legacy_repair_ids).delete()
        Vehicle.objects.filter(license_plate__in=self.LEGACY_DEMO_VEHICLE_PLATES).delete()
        Customer.objects.filter(phone__in=self.LEGACY_DEMO_CUSTOMER_PHONES).delete()

    def _upsert_users(self, rows):
        """
        Upserts user accounts from an iterable of row dictionaries keyed by email.
        
        Each row must contain an "email" and may include "first_name", "last_name", "role", "is_staff", and "password". If a user with the given email does not exist it is created with the provided fields; if it exists, the provided name/role/is_staff values are applied. If a password is provided for a newly created user, it will be set.
        
        Parameters:
            rows (Iterable[dict]): Iterable of dicts representing users. Required key: "email". Optional keys: "first_name", "last_name", "role", "is_staff", "password".
        
        Returns:
            dict: Mapping from email string to the corresponding User instance.
        """
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
        """
        Upserts Service records from payload rows and returns a mapping of created or updated Service instances by row key.
        
        Parameters:
            rows (Iterable[dict]): Iterable of row dictionaries; each row must contain at least "name" and "key" and may include "description", "price", and "is_active".
            marker (str): Marker string appended into text fields to identify imported demo data.
        
        Returns:
            dict: Mapping from each row["key"] to the corresponding Service instance.
        """
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
        """
        Upserts supplier records from payload rows and returns a mapping of payload keys to Supplier instances.
        
        Parameters:
            rows (Iterable[dict]): Iterable of supplier payload objects. Each row must contain "name" and "key";
                may include "nip", "phone", "email", "registered_address", and "notes".
            marker (str): Marker string to append to supplier notes via with_marker.
        
        Returns:
            dict: Mapping from each row["key"] to the created or updated Supplier instance.
        """
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

    def _create_customers(self, rows, marker: str, users_by_email):
        """
        Create Customer records from payload rows, assigning a default staff assignee when available.
        
        Parameters:
        	rows (Iterable[dict]): Iterable of payload rows where each row contains at least "key" and "full_name"; optional fields include "phone", "email", and "notes".
        	marker (str): Marker string appended to customer notes via with_marker.
        	users_by_email (Mapping[str, User]): Mapping of user email to User; used to select a default assignee. Prefers "staff@autoservice.local", otherwise the first user whose `role` attribute equals "staff".
        
        Returns:
        	dict: Mapping from each row's "key" to the created Customer instance.
        """
        customers = {}
        default_assignee = users_by_email.get("staff@autoservice.local")
        if default_assignee is None:
            default_assignee = next((user for user in users_by_email.values() if getattr(user, "role", "") == "staff"), None)
        for row in rows:
            customer = Customer.objects.create(
                full_name=row["full_name"],
                phone=row.get("phone", ""),
                email=row.get("email", ""),
                notes=with_marker(row.get("notes", ""), marker),
                assigned_to=default_assignee,
            )
            customers[row["key"]] = customer
        return customers

    def _create_vehicles(self, rows, customers_by_key, marker: str):
        """
        Create Vehicle records from payload rows and return them keyed by each row's `key`.
        
        Each created Vehicle is associated with the Customer from `customers_by_key` and has its textual `notes` tagged with `marker`.
        
        Parameters:
            rows (Iterable[dict]): Iterable of mapping objects containing vehicle data (expected keys include "key", "customer_key", "license_plate", "make", "model" and optional vehicle fields such as "year", "vin", "color", "mileage", "last_service_date", "added_date", "notes").
            customers_by_key (dict): Mapping of customer keys to Customer model instances used to set each vehicle's `customer`.
            marker (str): String marker appended to the vehicle `notes` to indicate the import dataset.
        
        Returns:
            dict: Mapping from each input row's `key` to the created Vehicle instance.
        """
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
        """
        Create Repair records from payload rows and associated RepairServiceLine entries, returning a mapping of payload keys to created Repair instances.
        
        Parameters:
            rows (iterable): Iterable of payload dictionaries describing repairs. Each row must include "key", "vehicle_key", and "service_name"; optional fields include "master_email", "tracking_code", "issue_notes", "status", "mileage_at_service", "estimated_date", "completed_at", and "service_line_keys".
            vehicles_by_key (dict): Mapping from vehicle payload keys to Vehicle model instances used for the Repair.vehicle field.
            services_by_key (dict): Mapping from service payload keys to Service model instances used to populate RepairServiceLine entries.
            users_by_email (dict): Mapping from user email to User model instances; used to resolve the repair master via the row's "master_email".
            marker (str): Dataset marker string appended to textual fields via with_marker for traceability.
        
        Returns:
            dict: Mapping from each row's "key" to the created Repair instance.
        """
        repairs = {}
        for row in rows:
            repair = Repair.objects.create(
                vehicle=vehicles_by_key[row["vehicle_key"]],
                master=users_by_email.get(row.get("master_email")),
                tracking_code=row.get("tracking_code", ""),
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
        """
        Create Purchase records from payload rows and persist them to the database.
        
        Ensures a unit-of-measure with code "pcs" exists (creates it if missing), then for each input row creates a Purchase linked to the supplier, optional vehicle, and optional repair. Numeric fields (quantity, current_stock_quantity, purchase_price, sale_price) are parsed with parse_decimal; missing current_stock_quantity is stored as None. If a repair is provided via repairs_by_key, its tracking_code is stored on the purchase; otherwise repair_code is an empty string.
        
        Parameters:
            rows (Iterable[dict]): Iterable of purchase payload dictionaries.
            suppliers_by_key (dict): Mapping of supplier keys to Supplier instances.
            vehicles_by_key (dict): Mapping of vehicle keys to Vehicle instances.
            repairs_by_key (dict): Mapping of repair keys to Repair instances.
        
        """
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

    def _prepare_completed_repair_acts(self, repairs_by_key, users_by_email) -> int:
        exporter = users_by_email.get("staff@autoservice.local") or next(iter(users_by_email.values()), None)
        if exporter is None:
            return 0

        prepared = 0
        for repair in repairs_by_key.values():
            if repair.status in (Repair.Status.COMPLETED, Repair.Status.PICKED_UP):
                export_repair_pdf_and_snapshot(repair, exporter)
                prepared += 1
        return prepared
