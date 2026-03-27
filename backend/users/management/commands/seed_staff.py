from django.conf import settings
from django.core.management.base import BaseCommand

from users.models import User


class Command(BaseCommand):
    help = "Create or update the initial staff user from environment or debug defaults."

    def handle(self, *args, **options):
        email = settings.STAFF_EMAIL or None
        password = settings.STAFF_PASSWORD or None

        if not email and settings.DEBUG:
            email = "staff@autoservice.local"
            password = "staff12345"

        if not email or not password:
            self.stdout.write("No staff credentials configured; skipping seed_staff.")
            return

        user, created = User.objects.get_or_create(
            email=email.lower(),
            defaults={
                "first_name": "Ivan",
                "last_name": "Master",
                "role": User.Role.STAFF,
                "is_staff": False,
                "is_superuser": False,
            },
        )
        user.role = User.Role.STAFF
        user.is_active = True
        user.set_password(password)
        user.save()

        action = "Created" if created else "Updated"
        self.stdout.write(f"{action} staff user: {user.email}")
