from django.contrib.auth.backends import ModelBackend

from core.auth_utils import resolve_user_by_login_id


class EmailBackend(ModelBackend):
    """Allow login with email, username, or profile username + password."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        identifier = (kwargs.get("email") or username or "").strip()
        if not identifier or not password:
            return None

        user = resolve_user_by_login_id(identifier)
        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

    def get_user(self, user_id):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
