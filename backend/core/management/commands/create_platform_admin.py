from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.models import AppRole, UserRole

User = get_user_model()


class Command(BaseCommand):
    help = "Create a platform administrator account for MehMediCore."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", required=True)
        parser.add_argument("--username", default="")
        parser.add_argument("--full-name", default="Platform Administrator")

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        password = options["password"]
        username = (options["username"] or email.split("@")[0]).strip()
        full_name = options["full_name"].strip()

        user = User.objects.filter(email__iexact=email).first()
        created = user is None
        if created:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=full_name,
                is_staff=True,
                is_superuser=True,
            )
        else:
            user.username = username
            user.first_name = full_name
            user.is_staff = True
            user.is_superuser = True
            user.save()
            user.set_password(password)
            user.save(update_fields=["password"])

        profile = user.profile
        profile.full_name = full_name
        profile.username = username
        profile.save(update_fields=["full_name", "username", "updated_at"])

        UserRole.objects.filter(user=user).delete()
        UserRole.objects.create(user=user, role=AppRole.ADMIN)

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} platform admin: {email}"))
