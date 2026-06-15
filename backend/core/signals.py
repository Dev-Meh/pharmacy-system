from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from core.models import AppRole, Profile, UserRole

User = get_user_model()


@receiver(post_save, sender=User)
def setup_new_user(sender, instance, created, **kwargs):
    """Create profile and assign role (first user → admin, else pharmacist)."""
    if not created:
        return

    username = instance.username or instance.email.split("@")[0]
    Profile.objects.get_or_create(
        user=instance,
        defaults={
            "full_name": f"{instance.first_name} {instance.last_name}".strip(),
            "username": username,
        },
    )

    if instance.is_superuser:
        default_role = AppRole.ADMIN
    elif UserRole.objects.exists():
        default_role = AppRole.PHARMACIST
    else:
        default_role = AppRole.ADMIN

    UserRole.objects.get_or_create(user=instance, role=default_role)
