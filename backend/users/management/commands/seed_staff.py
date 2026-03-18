from django.core.management.base import BaseCommand

from users.models import User


class Command(BaseCommand):
    help = "Create a test staff user for local development."

    def handle(self, *args, **options):
        email = "staff@autoservice.local"
        password = "staff12345"

        user, created = User.objects.get_or_create(
            email=email,
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
