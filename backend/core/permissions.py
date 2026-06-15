from rest_framework.permissions import BasePermission

from core.models import AppRole


def user_has_role(user, role: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    return user.role_assignments.filter(role=role).exists()


def is_platform_admin(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    return bool(user.is_superuser or user_has_role(user, AppRole.ADMIN))


def user_is_store_manager(user) -> bool:
    return user_has_role(user, AppRole.STORE_MANAGER) and not is_platform_admin(user)


def user_is_admin_or_manager(user) -> bool:
    return is_platform_admin(user) or user_is_store_manager(user)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_platform_admin(request.user)


class IsAdminOrStoreManager(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (is_platform_admin(user) or user_is_store_manager(user))
        )


class IsPharmacyManager(BasePermission):
    def has_permission(self, request, view):
        return user_is_store_manager(request.user)


class HasPharmacySystemAccess(BasePermission):
    """Managers and pharmacists may use the system only when their pharmacy is active."""

    message = "Your pharmacy does not have system access yet."

    def has_permission(self, request, view):
        from core.pharmacy_utils import user_has_pharmacy_access

        user = request.user
        return bool(user and user.is_authenticated and user_has_pharmacy_access(user))
