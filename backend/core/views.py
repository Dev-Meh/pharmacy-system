from datetime import datetime, timedelta
from decimal import Decimal

from django.contrib.auth import authenticate, get_user_model
from django.db.models import Sum
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from core.auth_utils import resolve_user_by_login_id
from core.branch_utils import branches_for_user, resolve_branch_id
from core.inventory import add_branch_stock, get_branch_quantity
from core.models import (
    AppRole,
    Branch,
    BranchMembership,
    BranchStock,
    Pharmacy,
    Product,
    Profile,
    Sale,
    StockOrder,
    StockImport,
    StockOrderStatus,
    UserRole,
)
from core.sales_chart import VALID_CHART_PERIODS, build_sales_chart
from core.sales_report import VALID_PERIODS, build_sales_report
from core.permissions import (
    HasPharmacySystemAccess,
    IsAdmin,
    IsAdminOrStoreManager,
    IsPharmacyManager,
    is_platform_admin,
    user_has_role,
    user_is_admin_or_manager,
    user_is_store_manager,
)
from core.pharmacy_utils import (
    pharmacies_queryset_for_user,
    pharmacy_access_denied_message,
    pharmacy_for_user,
    pharmacy_has_system_access,
    profiles_for_pharmacy_manager,
)
from core.serializers import (
    AdminCreateUserSerializer,
    AssignBranchMemberSerializer,
    BranchInventorySerializer,
    BranchMemberSerializer,
    BranchSerializer,
    ChangePasswordSerializer,
    DashboardStatsSerializer,
    MeSerializer,
    ProductLiteSerializer,
    ProductSerializer,
    ProfileUpdateSerializer,
    PlatformDashboardStatsSerializer,
    PharmacyAccessUpdateSerializer,
    PharmacyManagerPasswordSerializer,
    PharmacySerializer,
    RegisterPharmacySerializer,
    SaleSerializer,
    SaleBatchCreateSerializer,
    SalesChartSerializer,
    SalesReportSerializer,
    SetUserRoleSerializer,
    StockImportSerializer,
    StockOrderSerializer,
    StockOrderReceiveSerializer,
    StockOrderStatusSerializer,
    UserWithRolesSerializer,
)

User = get_user_model()

PHARMACY_ACCESS = [IsAuthenticated, HasPharmacySystemAccess]


class _InventoryRow:
    def __init__(self, product, quantity):
        self.product = product
        self.quantity = quantity


def _branch_inventory(branch_id):
    branch = Branch.objects.select_related("pharmacy").get(pk=branch_id)
    stocks = {
        s.product_id: s.quantity
        for s in BranchStock.objects.filter(branch_id=branch_id).select_related("product")
    }
    product_qs = Product.objects.filter(pharmacy=branch.pharmacy).order_by("name")
    rows = []
    for product in product_qs:
        rows.append(_InventoryRow(product, stocks.get(product.id, 0)))
    return rows


def _products_for_user(user):
    pharmacy = pharmacy_for_user(user)
    if not pharmacy:
        return Product.objects.none()
    return Product.objects.filter(pharmacy=pharmacy)


class ProductListCreateView(generics.ListCreateAPIView):
    """Pharmacy product catalog."""

    serializer_class = ProductSerializer

    def get_queryset(self):
        return _products_for_user(self.request.user)

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated, HasPharmacySystemAccess, IsAdminOrStoreManager]
        return PHARMACY_ACCESS

    def perform_create(self, serializer):
        pharmacy = pharmacy_for_user(self.request.user)
        if not pharmacy:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No pharmacy linked to this account.")
        serializer.save(pharmacy=pharmacy)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return _products_for_user(self.request.user)

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsAuthenticated, HasPharmacySystemAccess, IsAdminOrStoreManager]
        return PHARMACY_ACCESS


class BranchInventoryListView(APIView):
    """All catalog products with stock quantity for the active branch."""

    permission_classes = PHARMACY_ACCESS

    def get(self, request):
        branch_id = resolve_branch_id(request)
        rows = _branch_inventory(branch_id)
        return Response(BranchInventorySerializer(rows, many=True).data)


class DrugInStockListView(generics.ListAPIView):
    """Products with quantity > 0 at branch (for sales)."""

    permission_classes = PHARMACY_ACCESS
    serializer_class = ProductLiteSerializer

    def get_queryset(self):
        branch_id = resolve_branch_id(self.request)
        product_ids = BranchStock.objects.filter(
            branch_id=branch_id, quantity__gt=0
        ).values_list("product_id", flat=True)
        return Product.objects.filter(id__in=product_ids).order_by("name")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["branch_id"] = resolve_branch_id(self.request)
        return ctx


class HomeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "name": "MehMediCore Pharmacy API",
                "docs": "See backend/README.md for endpoint list.",
                "endpoints": {
                    "admin": "/admin/",
                    "api": "/api/",
                    "auth_login": "/api/auth/login/",
                },
            }
        )


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = (
            request.data.get("email")
            or request.data.get("username")
            or request.data.get("login")
            or ""
        ).strip()
        password = request.data.get("password") or ""

        if not identifier or not password:
            return Response(
                {"detail": "Email or username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = resolve_user_by_login_id(identifier)
        if user is None or not user.check_password(password):
            return Response(
                {"detail": "Invalid email, username, or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"detail": "This account is disabled."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not is_platform_admin(user):
            pharmacy = pharmacy_for_user(user)
            if not pharmacy_has_system_access(pharmacy):
                return Response(
                    {"detail": pharmacy_access_denied_message(pharmacy)},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return Response(
            {
                "user": MeSerializer({"user": user}).data,
                "tokens": tokens_for_user(user),
            }
        )


class LogoutView(APIView):
    """Client should discard JWT tokens after calling this endpoint."""

    def post(self, request):
        return Response({"detail": "Logged out."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer({"user": request.user}).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        profile = request.user.profile
        update_fields = ["updated_at"]

        if "full_name" in serializer.validated_data:
            profile.full_name = serializer.validated_data["full_name"]
            update_fields.append("full_name")
        if "username" in serializer.validated_data:
            profile.username = serializer.validated_data["username"]
            update_fields.append("username")

        profile.save(update_fields=update_fields)
        return Response(MeSerializer({"user": request.user}).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password updated."})


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, HasPharmacySystemAccess, IsPharmacyManager]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminCreateUserSerializer
        return UserWithRolesSerializer

    def get_queryset(self):
        return profiles_for_pharmacy_manager(self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = AdminCreateUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserWithRolesSerializer(user.profile).data,
            status=status.HTTP_201_CREATED,
        )


class SetUserRoleView(APIView):
    permission_classes = [IsAuthenticated, HasPharmacySystemAccess, IsPharmacyManager]

    def patch(self, request, user_id):
        serializer = SetUserRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_role = serializer.validated_data["role"]

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not profiles_for_pharmacy_manager(request.user).filter(user_id=user_id).exists():
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        UserRole.objects.filter(user=user).delete()
        UserRole.objects.create(user=user, role=new_role)

        profile = user.profile
        return Response(UserWithRolesSerializer(profile).data)


class PharmacyListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return RegisterPharmacySerializer
        return PharmacySerializer

    def get_queryset(self):
        from django.db.models import Prefetch

        branches_qs = Branch.objects.filter(is_active=True).prefetch_related("memberships")
        return pharmacies_queryset_for_user(self.request.user).select_related(
            "manager", "manager__profile"
        ).prefetch_related(Prefetch("branches", queryset=branches_qs))

    def create(self, request, *args, **kwargs):
        serializer = RegisterPharmacySerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        pharmacy = serializer.save()
        return Response(
            PharmacySerializer(pharmacy, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class PharmacyAccessView(APIView):
    """Platform admin grants or revokes pharmacy system access after payment."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        pharmacy = pharmacies_queryset_for_user(request.user).filter(pk=pk).first()
        if not pharmacy:
            return Response({"detail": "Pharmacy not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PharmacyAccessUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["access_status"]

        pharmacy.access_status = new_status
        if "payment_notes" in serializer.validated_data:
            pharmacy.payment_notes = serializer.validated_data["payment_notes"]

        if new_status == Pharmacy.AccessStatus.ACTIVE:
            pharmacy.access_granted_at = timezone.now()
            pharmacy.access_granted_by = request.user
        elif new_status in (Pharmacy.AccessStatus.PENDING, Pharmacy.AccessStatus.SUSPENDED):
            pharmacy.access_granted_at = None
            pharmacy.access_granted_by = None

        pharmacy.save(
            update_fields=[
                "access_status",
                "payment_notes",
                "access_granted_at",
                "access_granted_by",
                "updated_at",
            ]
        )
        return Response(PharmacySerializer(pharmacy, context={"request": request}).data)


class PharmacyManagerPasswordView(APIView):
    """Platform admin resets a pharmacy manager's sign-in password."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        pharmacy = pharmacies_queryset_for_user(request.user).filter(pk=pk).first()
        if not pharmacy:
            return Response({"detail": "Pharmacy not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PharmacyManagerPasswordSerializer(
            data=request.data,
            context={"pharmacy": pharmacy, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Manager password updated."})


class DrugListCreateView(BranchInventoryListView):
    """Backward-compatible alias: branch inventory list."""

    def post(self, request, *args, **kwargs):
        return Response(
            {"detail": "Use POST /api/products/ to add catalog products."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )


class DrugDetailView(ProductDetailView):
    """Backward-compatible alias: edit global product catalog."""


class SaleListCreateView(generics.ListCreateAPIView):
    serializer_class = SaleSerializer

    def get_queryset(self):
        branch_id = resolve_branch_id(self.request)
        qs = Sale.objects.select_related("product", "sold_by").filter(branch_id=branch_id)
        user = self.request.user
        if user_is_store_manager(user) or user.is_superuser:
            return qs
        return qs.filter(sold_by=user)

    def get_permissions(self):
        return PHARMACY_ACCESS

    def create(self, request, *args, **kwargs):
        if isinstance(request.data.get("items"), list):
            serializer = SaleBatchCreateSerializer(
                data=request.data, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            sales = serializer.save()
            return Response(
                SaleSerializer(sales, many=True).data,
                status=status.HTTP_201_CREATED,
            )
        return super().create(request, *args, **kwargs)


class SalesReportView(APIView):
    permission_classes = PHARMACY_ACCESS

    def get(self, request):
        period = (request.query_params.get("period") or "daily").lower()
        if period not in VALID_PERIODS:
            return Response(
                {"period": f"Must be one of: {', '.join(VALID_PERIODS)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        branch_id = resolve_branch_id(request)
        anchor = None
        date_param = request.query_params.get("date")
        if date_param:
            try:
                anchor = datetime.strptime(date_param, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"date": "Use YYYY-MM-DD format."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        report = build_sales_report(
            period=period,
            branch_id=branch_id,
            user=request.user,
            anchor=anchor,
        )
        return Response(SalesReportSerializer(report).data)


class DashboardStatsView(APIView):
    permission_classes = PHARMACY_ACCESS

    def get(self, request):
        if is_platform_admin(request.user):
            data = {
                "is_platform_admin": True,
                "pharmacy_count": Pharmacy.objects.count(),
                "active_pharmacies": Pharmacy.objects.filter(
                    access_status=Pharmacy.AccessStatus.ACTIVE, is_active=True
                ).count(),
                "pending_pharmacies": Pharmacy.objects.filter(
                    access_status=Pharmacy.AccessStatus.PENDING
                ).count(),
                "suspended_pharmacies": Pharmacy.objects.filter(
                    access_status=Pharmacy.AccessStatus.SUSPENDED
                ).count(),
                "manager_count": Pharmacy.objects.filter(is_active=True).count(),
                "branch_count": Branch.objects.filter(is_active=True).count(),
            }
            return Response(data)

        branch_id = resolve_branch_id(request)
        today = timezone.localdate()
        in_30_days = today + timedelta(days=30)

        branch = Branch.objects.select_related("pharmacy").get(pk=branch_id)
        total_drugs = Product.objects.filter(pharmacy=branch.pharmacy).count()
        stocks = BranchStock.objects.filter(branch_id=branch_id)
        low_stock = stocks.filter(quantity__lte=LOW_STOCK_THRESHOLD).count()
        expiring_soon = Product.objects.filter(
            pharmacy=branch.pharmacy,
            expiry_date__isnull=False,
            expiry_date__lte=in_30_days,
        ).count()

        sales_today = (
            Sale.objects.filter(branch_id=branch_id, sold_at__date=today).aggregate(
                total=Sum("total")
            )["total"]
            or Decimal("0")
        )

        if not (user_is_store_manager(request.user) or request.user.is_superuser):
            sales_today = (
                Sale.objects.filter(
                    branch_id=branch_id,
                    sold_at__date=today,
                    sold_by=request.user,
                ).aggregate(total=Sum("total"))["total"]
                or Decimal("0")
            )

        data = {
            "total_drugs": total_drugs,
            "low_stock": low_stock,
            "expiring_soon": expiring_soon,
            "sales_today": int(sales_today.quantize(Decimal("1")) if sales_today else 0),
        }
        return Response(DashboardStatsSerializer(data).data)


class SalesChartView(APIView):
    permission_classes = PHARMACY_ACCESS

    def get(self, request):
        period = (request.query_params.get("period") or "30d").lower()
        if period not in VALID_CHART_PERIODS:
            return Response(
                {"period": f"Must be one of: {', '.join(VALID_CHART_PERIODS)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        branch_id = resolve_branch_id(request)
        chart = build_sales_chart(
            branch_id=branch_id,
            user=request.user,
            period=period,
        )
        return Response(SalesChartSerializer(chart).data)


class LowStockDrugListView(APIView):
    permission_classes = PHARMACY_ACCESS

    def get(self, request):
        branch_id = resolve_branch_id(request)
        rows = [
            row for row in _branch_inventory(branch_id)
            if row.quantity <= LOW_STOCK_THRESHOLD
        ]
        rows.sort(key=lambda r: (r.quantity, r.product.name))
        return Response(BranchInventorySerializer(rows, many=True).data)


class StockOrderListCreateView(generics.ListCreateAPIView):
    permission_classes = PHARMACY_ACCESS
    serializer_class = StockOrderSerializer

    def get_queryset(self):
        branch_id = resolve_branch_id(self.request)
        qs = StockOrder.objects.select_related("product", "requested_by").filter(
            branch_id=branch_id
        )
        user = self.request.user
        if user.is_superuser or user_is_store_manager(user):
            return qs
        return qs.filter(requested_by=user)

    def get_permissions(self):
        return PHARMACY_ACCESS


class StockOrderDetailView(APIView):
    permission_classes = PHARMACY_ACCESS

    def patch(self, request, pk):
        branch_id = resolve_branch_id(request)
        try:
            order = StockOrder.objects.select_related("product").get(
                pk=pk, branch_id=branch_id
            )
        except StockOrder.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        if "quantity_imported" in request.data:
            return self._record_import(request, order)

        if not user_is_store_manager(request.user) and not request.user.is_superuser:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        if order.status != StockOrderStatus.PENDING:
            return Response(
                {"detail": "Only pending orders can be updated."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = StockOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data["status"]

        order.status = new_status
        order.save(update_fields=["status", "updated_at"])

        return Response(StockOrderSerializer(order).data)

    def _record_import(self, request, order):
        if order.status != StockOrderStatus.FULFILLED:
            return Response(
                {"detail": "Only fulfilled orders can be received."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = StockOrderReceiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        qty = serializer.validated_data["quantity_imported"]

        add_branch_stock(order.branch, order.product, qty)

        order.quantity_imported = qty
        order.imported_by = request.user
        order.imported_at = timezone.now()
        order.status = StockOrderStatus.RECEIVED
        order.save(
            update_fields=[
                "quantity_imported",
                "imported_by",
                "imported_at",
                "status",
                "updated_at",
            ]
        )

        return Response(StockOrderSerializer(order).data)


class StockImportListCreateView(generics.ListCreateAPIView):
    """Direct inventory add at branch — no reorder required."""

    permission_classes = PHARMACY_ACCESS
    serializer_class = StockImportSerializer

    def get_queryset(self):
        branch_id = resolve_branch_id(self.request)
        return StockImport.objects.select_related("product", "imported_by").filter(
            branch_id=branch_id
        )


class BranchListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, HasPharmacySystemAccess, IsAdminOrStoreManager]
    serializer_class = BranchSerializer

    def get_queryset(self):
        return branches_for_user(self.request.user)

    def perform_create(self, serializer):
        pharmacy = pharmacy_for_user(self.request.user)
        if not pharmacy:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No pharmacy linked to this account.")
        branch = serializer.save(created_by=self.request.user, pharmacy=pharmacy)
        BranchMembership.objects.get_or_create(
            branch=branch,
            user=self.request.user,
            defaults={"is_manager": True},
        )


class BranchDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, HasPharmacySystemAccess, IsAdminOrStoreManager]
    serializer_class = BranchSerializer
    lookup_field = "pk"

    def get_queryset(self):
        return branches_for_user(self.request.user)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


class BranchMemberListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasPharmacySystemAccess, IsAdminOrStoreManager]

    def get_branch(self, request, pk):
        branch = branches_for_user(request.user).filter(pk=pk).first()
        if not branch:
            return None
        return branch

    def get(self, request, pk):
        branch = self.get_branch(request, pk)
        if not branch:
            return Response({"detail": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)
        members = branch.memberships.select_related("user", "user__profile").order_by(
            "-is_manager", "user__profile__full_name"
        )
        return Response(BranchMemberSerializer(members, many=True).data)

    def post(self, request, pk):
        branch = self.get_branch(request, pk)
        if not branch:
            return Response({"detail": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = AssignBranchMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_id = serializer.validated_data["user_id"]
        is_manager = serializer.validated_data["is_manager"]

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if not is_manager and user_has_role(user, AppRole.PHARMACIST):
            BranchMembership.objects.filter(user=user, is_manager=False).exclude(
                branch=branch
            ).delete()

        membership, _ = BranchMembership.objects.update_or_create(
            branch=branch,
            user=user,
            defaults={"is_manager": is_manager},
        )
        return Response(
            BranchMemberSerializer(membership).data,
            status=status.HTTP_201_CREATED,
        )


class BranchMemberDetailView(APIView):
    permission_classes = [IsAuthenticated, HasPharmacySystemAccess, IsAdminOrStoreManager]

    def delete(self, request, pk, user_id):
        branch = branches_for_user(request.user).filter(pk=pk).first()
        if not branch:
            return Response({"detail": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)
        deleted, _ = BranchMembership.objects.filter(branch=branch, user_id=user_id).delete()
        if not deleted:
            return Response({"detail": "Member not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

