from django.conf import settings
from django.core.management.base import BaseCommand

from users.models import User


class Command(BaseCommand):
    help = "Create or update the initial admin user from environment or debug defaults."

    def handle(self, *args, **options):
        email = settings.ADMIN_EMAIL or None
        password = settings.ADMIN_PASSWORD or None

        if not email and settings.DEBUG:
            email = "admin@autoservice.local"
            password = "admin12345"

        if not email or not password:
            self.stdout.write("No admin credentials configured; skipping seed_admin.")
            return

        user, created = User.objects.get_or_create(
            email=email.lower(),
            defaults={
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        user.role = User.Role.ADMIN
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        action = "Created" if created else "Updated"
        self.stdout.write(f"{action} admin user: {user.email}")
