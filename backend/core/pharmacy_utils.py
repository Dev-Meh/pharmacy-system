from core.models import AppRole, Branch, Pharmacy, Profile
from core.permissions import is_platform_admin, user_has_role


def pharmacy_has_system_access(pharmacy: Pharmacy | None) -> bool:
    if not pharmacy or not pharmacy.is_active:
        return False
    return pharmacy.access_status == Pharmacy.AccessStatus.ACTIVE


def user_has_pharmacy_access(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if is_platform_admin(user):
        return True
    return pharmacy_has_system_access(pharmacy_for_user(user))


def pharmacy_access_denied_message(pharmacy: Pharmacy | None) -> str:
    if not pharmacy:
        return "No pharmacy is linked to this account."
    if pharmacy.access_status == Pharmacy.AccessStatus.PENDING:
        return (
            "Your pharmacy account is awaiting payment confirmation. "
            "The platform administrator will grant access after payment is received."
        )
    if pharmacy.access_status == Pharmacy.AccessStatus.SUSPENDED:
        return "Your pharmacy access has been suspended. Contact the platform administrator."
    if not pharmacy.is_active:
        return "This pharmacy account is inactive."
    return "You do not have access to the pharmacy system."


def pharmacy_for_user(user):
    """Pharmacy branding / scope for the logged-in user."""
    if not user or not user.is_authenticated:
        return None
    if is_platform_admin(user):
        return None
    try:
        return user.managed_pharmacy
    except Pharmacy.DoesNotExist:
        pass
    branch = (
        Branch.objects.filter(is_active=True, memberships__user=user)
        .select_related("pharmacy")
        .first()
    )
    return branch.pharmacy if branch and branch.pharmacy_id else None


def pharmacies_queryset_for_user(user):
    qs = Pharmacy.objects.select_related("manager", "manager__profile").order_by("name")
    if not user or not user.is_authenticated:
        return Pharmacy.objects.none()
    if is_platform_admin(user):
        return qs
    pharmacy = pharmacy_for_user(user)
    if pharmacy:
        return qs.filter(pk=pharmacy.pk)
    return Pharmacy.objects.none()


def user_ids_in_pharmacy(pharmacy: Pharmacy):
    branch_user_ids = pharmacy.branches.values_list(
        "memberships__user_id", flat=True
    ).distinct()
    ids = set(branch_user_ids)
    ids.add(pharmacy.manager_id)
    return ids


def profiles_for_pharmacy_manager(user):
    pharmacy = pharmacy_for_user(user)
    if not pharmacy or pharmacy.manager_id != user.pk:
        return Profile.objects.none()
    return (
        Profile.objects.select_related("user")
        .prefetch_related("user__role_assignments")
        .filter(user_id__in=user_ids_in_pharmacy(pharmacy))
        .exclude(user__role_assignments__role=AppRole.ADMIN)
    )
