from django.contrib.auth import get_user_model

from core.models import Profile

User = get_user_model()


def resolve_user_by_login_id(identifier: str):
    """Find a user by email, Django username, or profile username."""
    identifier = (identifier or "").strip()
    if not identifier:
        return None

    if "@" in identifier:
        return User.objects.filter(email__iexact=identifier).first()

    user = User.objects.filter(username__iexact=identifier).first()
    if user:
        return user

    profile = (
        Profile.objects.filter(username__iexact=identifier)
        .select_related("user")
        .first()
    )
    return profile.user if profile else None
