from rest_framework.exceptions import PermissionDenied, ValidationError

from core.models import AppRole, Branch, Pharmacy
from core.permissions import is_platform_admin, user_is_store_manager
from core.pharmacy_utils import pharmacy_has_system_access


def branches_for_user(user):
  qs = Branch.objects.filter(is_active=True).select_related("pharmacy").order_by("name")
  if not user or not user.is_authenticated:
    return Branch.objects.none()
  if is_platform_admin(user):
    return Branch.objects.none()
  try:
    managed = user.managed_pharmacy
    if not pharmacy_has_system_access(managed):
      return Branch.objects.none()
    return qs.filter(pharmacy=managed)
  except Pharmacy.DoesNotExist:
    pass
  if user_is_store_manager(user):
    return qs.filter(memberships__user=user, memberships__is_manager=True).distinct()
  qs = qs.filter(memberships__user=user).distinct()
  return qs.filter(pharmacy__access_status=Pharmacy.AccessStatus.ACTIVE, pharmacy__is_active=True)


def resolve_pharmacy_id(request, *, required=False):
    pharmacy = pharmacy_for_user(request.user)
    if pharmacy:
        return str(pharmacy.pk)
    if required:
        from rest_framework.exceptions import ValidationError
        raise ValidationError({"pharmacy": "No pharmacy is linked to this account."})
    return None


def resolve_branch_id(request, *, required=True, from_body=False):
    branch_id = None
    if hasattr(request, "query_params"):
        branch_id = request.query_params.get("branch")
    if not branch_id and hasattr(request, "data"):
        branch_id = request.data.get("branch_id")

    accessible = branches_for_user(request.user)

    if not branch_id:
        if accessible.count() == 1:
            return str(accessible.first().pk)
        if required:
            raise ValidationError({"branch": "Select a branch to continue."})
        return None

    if not accessible.filter(pk=branch_id).exists():
        raise PermissionDenied("You do not have access to this branch.")
    return str(branch_id)


def get_branch_or_404(branch_id):
  try:
    return Branch.objects.get(pk=branch_id, is_active=True)
  except Branch.DoesNotExist:
    raise ValidationError({"branch": "Branch not found."}) from None
