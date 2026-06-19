from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from core.models import AppRole, Branch, BranchMembership, BranchStock, Pharmacy, Product, Profile, Sale, StockOrder, StockOrderStatus, StockImport, UserRole
from core.permissions import is_platform_admin
from core.pharmacy_utils import pharmacy_for_user

User = get_user_model()


class AdminCreateUserSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6, max_length=72)
    full_name = serializers.CharField(max_length=100)
    username = serializers.CharField(max_length=50)
    role = serializers.ChoiceField(
        choices=[
            (AppRole.PHARMACIST, AppRole.PHARMACIST),
            (AppRole.STORE_MANAGER, AppRole.STORE_MANAGER),
        ],
        default=AppRole.PHARMACIST,
    )
    branch_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        request = self.context.get("request")
        if request and is_platform_admin(request.user):
            raise serializers.ValidationError(
                "Platform administrators register pharmacies with managers instead."
            )
        return attrs

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        role = validated_data.pop("role", AppRole.PHARMACIST)
        email = validated_data["email"]
        username = validated_data["username"]
        full_name = validated_data["full_name"].strip()
        password = validated_data["password"]

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=full_name,
        )

        profile = user.profile
        profile.full_name = full_name
        profile.username = username
        pharmacy = pharmacy_for_user(self.context["request"].user)
        if pharmacy:
            profile.pharmacy = pharmacy
        profile.save(update_fields=["full_name", "username", "pharmacy", "updated_at"])

        UserRole.objects.filter(user=user).delete()
        UserRole.objects.create(user=user, role=role)

        branch_id = validated_data.get("branch_id")
        if branch_id:
            try:
                branch = Branch.objects.get(pk=branch_id, is_active=True)
            except Branch.DoesNotExist:
                raise serializers.ValidationError(
                    {"branch_id": "Branch not found."}
                ) from None
            if pharmacy and branch.pharmacy_id != pharmacy.pk:
                raise serializers.ValidationError(
                    {"branch_id": "Branch is not in your pharmacy."}
                )
            if role == AppRole.PHARMACIST:
                BranchMembership.objects.filter(user=user, is_manager=False).delete()
            BranchMembership.objects.update_or_create(
                branch=branch,
                user=user,
                defaults={"is_manager": role == AppRole.STORE_MANAGER},
            )

        return user


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6, max_length=72)
    full_name = serializers.CharField(max_length=100)
    username = serializers.CharField(max_length=50)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        email = validated_data["email"]
        username = validated_data["username"]
        full_name = validated_data["full_name"].strip()
        password = validated_data["password"]

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=full_name,
        )

        profile = user.profile
        profile.full_name = full_name
        profile.username = username
        profile.save(update_fields=["full_name", "username", "updated_at"])

        return user


class ProfileSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="user_id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Profile
        fields = ["id", "full_name", "username", "email", "created_at", "updated_at"]


class UserWithRolesSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="user_id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    roles = serializers.SerializerMethodField()
    branch_id = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ["id", "full_name", "username", "email", "roles", "branch_id", "branch_name"]

    def get_roles(self, obj):
        return list(
            obj.user.role_assignments.values_list("role", flat=True)
        )

    def _pharmacy_membership(self, obj):
        request = self.context.get("request")
        if not request:
            return None
        pharmacy = pharmacy_for_user(request.user)
        if not pharmacy:
            return None
        return (
            obj.user.branch_memberships.filter(
                branch__pharmacy=pharmacy,
                branch__is_active=True,
                is_manager=False,
            )
            .select_related("branch")
            .first()
        )

    def get_branch_id(self, obj):
        membership = self._pharmacy_membership(obj)
        return str(membership.branch_id) if membership else None

    def get_branch_name(self, obj):
        membership = self._pharmacy_membership(obj)
        return membership.branch.name if membership else None


class MeSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="user.id")
    email = serializers.EmailField(source="user.email")
    is_superuser = serializers.BooleanField(source="user.is_superuser")
    is_platform_admin = serializers.SerializerMethodField()
    profile = ProfileSerializer(source="user.profile")
    roles = serializers.SerializerMethodField()
    pharmacy = serializers.SerializerMethodField()
    branches = serializers.SerializerMethodField()
    default_branch_id = serializers.SerializerMethodField()

    def get_is_platform_admin(self, obj):
        return is_platform_admin(obj["user"])

    def get_pharmacy(self, obj):
        pharmacy = pharmacy_for_user(obj["user"])
        if not pharmacy:
            return None
        return PharmacyBriefSerializer(pharmacy, context=self.context).data

    def get_roles(self, obj):
        return list(
            obj["user"].role_assignments.values_list("role", flat=True)
        )

    def get_branches(self, obj):
        from core.branch_utils import branches_for_user

        branches = branches_for_user(obj["user"])
        return BranchSerializer(branches, many=True).data

    def get_default_branch_id(self, obj):
        from core.branch_utils import branches_for_user

        branches = branches_for_user(obj["user"])
        first = branches.first()
        return str(first.pk) if first else None


class ProfileUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    username = serializers.CharField(max_length=50, required=False)

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Username is required.")
        user = self.context["request"].user
        if (
            Profile.objects.filter(username__iexact=value)
            .exclude(user_id=user.pk)
            .exists()
        ):
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_full_name(self, value):
        return value.strip()


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6, max_length=72)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        validate_password(value, self.context["request"].user)
        return value

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])


class BranchSerializer(serializers.ModelSerializer):
    pharmacist_count = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "address",
            "phone",
            "is_active",
            "pharmacist_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "pharmacist_count", "created_at", "updated_at"]

    def get_pharmacist_count(self, obj):
        return obj.memberships.filter(is_manager=False).count()


class BranchMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id")
    full_name = serializers.SerializerMethodField()
    email = serializers.EmailField(source="user.email")
    roles = serializers.SerializerMethodField()

    class Meta:
        model = BranchMembership
        fields = ["id", "user_id", "full_name", "email", "roles", "is_manager", "created_at"]
        read_only_fields = fields

    def get_full_name(self, obj):
        profile = getattr(obj.user, "profile", None)
        if profile and profile.full_name:
            return profile.full_name
        return obj.user.username or obj.user.email

    def get_roles(self, obj):
        return list(obj.user.role_assignments.values_list("role", flat=True))


class AssignBranchMemberSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    is_manager = serializers.BooleanField(default=False)


class SetUserRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=[
            (AppRole.PHARMACIST, AppRole.PHARMACIST),
            (AppRole.STORE_MANAGER, AppRole.STORE_MANAGER),
        ]
    )


class PharmacyBriefSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    has_system_access = serializers.SerializerMethodField()

    class Meta:
        model = Pharmacy
        fields = ["id", "name", "logo_url", "address", "phone", "access_status", "has_system_access"]

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.logo.url)
        return obj.logo.url

    def get_has_system_access(self, obj):
        from core.pharmacy_utils import pharmacy_has_system_access

        return pharmacy_has_system_access(obj)


class PharmacyAccessUpdateSerializer(serializers.Serializer):
    access_status = serializers.ChoiceField(choices=Pharmacy.AccessStatus.choices)
    payment_notes = serializers.CharField(required=False, allow_blank=True, default="")


class PharmacyManagerPasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(write_only=True, min_length=6, max_length=72)

    def validate_new_password(self, value):
        pharmacy = self.context["pharmacy"]
        validate_password(value, pharmacy.manager)
        return value

    def save(self):
        user = self.context["pharmacy"].manager
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user


class PharmacyManagerSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="user_id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Profile
        fields = ["id", "full_name", "username", "email"]


class PharmacySerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    manager = PharmacyManagerSerializer(source="manager.profile", read_only=True)
    branch_count = serializers.SerializerMethodField()
    branches = serializers.SerializerMethodField()

    class Meta:
        model = Pharmacy
        fields = [
            "id",
            "name",
            "logo_url",
            "address",
            "phone",
            "access_status",
            "payment_notes",
            "access_granted_at",
            "is_active",
            "manager",
            "branch_count",
            "branches",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.logo.url)
        return obj.logo.url

    def _active_branches(self, obj):
        if hasattr(obj, "_prefetched_objects_cache") and "branches" in obj._prefetched_objects_cache:
            return obj._prefetched_objects_cache["branches"]
        return obj.branches.filter(is_active=True)

    def get_branch_count(self, obj):
        return len(self._active_branches(obj))

    def get_branches(self, obj):
        return BranchSerializer(self._active_branches(obj), many=True).data


class RegisterPharmacySerializer(serializers.Serializer):
    pharmacy_name = serializers.CharField(max_length=255)
    logo = serializers.ImageField(required=False, allow_null=True)
    address = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    manager_email = serializers.EmailField()
    manager_password = serializers.CharField(write_only=True, min_length=6, max_length=72)
    manager_full_name = serializers.CharField(max_length=100)
    manager_username = serializers.CharField(max_length=50)

    def validate_pharmacy_name(self, value):
        value = value.strip()
        if Pharmacy.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("A pharmacy with this name already exists.")
        return value

    def validate_manager_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_manager_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_manager_password(self, value):
        return value

    def validate(self, data):
        temp_user = User(
            username=data.get("manager_username", "").strip(),
            email=data.get("manager_email", "").lower(),
            first_name=data.get("manager_full_name", "").strip(),
        )
        try:
            validate_password(data["manager_password"], user=temp_user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"manager_password": list(exc.messages)})
        return data

    def create(self, validated_data):
        admin = self.context["request"].user
        email = validated_data["manager_email"]
        username = validated_data["manager_username"]
        full_name = validated_data["manager_full_name"].strip()
        password = validated_data["manager_password"]

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=full_name,
        )
        profile = user.profile
        profile.full_name = full_name
        profile.username = username
        profile.save(update_fields=["full_name", "username", "updated_at"])

        UserRole.objects.filter(user=user).delete()
        UserRole.objects.create(user=user, role=AppRole.STORE_MANAGER)

        pharmacy = Pharmacy.objects.create(
            name=validated_data["pharmacy_name"].strip(),
            logo=validated_data.get("logo"),
            address=validated_data.get("address", ""),
            phone=validated_data.get("phone", ""),
            manager=user,
            created_by=admin,
            access_status=Pharmacy.AccessStatus.PENDING,
        )

        branch = Branch.objects.create(
            pharmacy=pharmacy,
            name=f"{pharmacy.name} — Main",
            address=pharmacy.address,
            phone=pharmacy.phone,
            created_by=admin,
        )
        BranchMembership.objects.create(branch=branch, user=user, is_manager=True)

        return pharmacy


class PlatformDashboardStatsSerializer(serializers.Serializer):
    is_platform_admin = serializers.BooleanField()
    pharmacy_count = serializers.IntegerField()
    active_pharmacies = serializers.IntegerField()
    pending_pharmacies = serializers.IntegerField()
    suspended_pharmacies = serializers.IntegerField()
    manager_count = serializers.IntegerField()
    branch_count = serializers.IntegerField()


class ProductSerializer(serializers.ModelSerializer):
    """Global product catalog — manager creates/edits."""

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "category",
            "price",
            "expiry_date",
            "supplier",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class BranchInventorySerializer(serializers.Serializer):
    """Product with stock quantity at the active branch."""

    id = serializers.UUIDField(source="product.id")
    name = serializers.CharField(source="product.name")
    category = serializers.CharField(source="product.category")
    price = serializers.DecimalField(source="product.price", max_digits=10, decimal_places=2)
    expiry_date = serializers.DateField(source="product.expiry_date", allow_null=True)
    supplier = serializers.CharField(source="product.supplier", allow_null=True)
    quantity = serializers.IntegerField()
    created_at = serializers.DateTimeField(source="product.created_at")
    updated_at = serializers.DateTimeField(source="product.updated_at")


class ProductLiteSerializer(serializers.ModelSerializer):
    quantity = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "name", "price", "quantity"]

    def get_quantity(self, obj):
        branch_id = self.context.get("branch_id")
        if not branch_id:
            return 0
        stock = BranchStock.objects.filter(branch_id=branch_id, product=obj).first()
        return stock.quantity if stock else 0


class SaleSerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField(write_only=True, required=False)
    drug_id = serializers.UUIDField(write_only=True, required=False)
    sold_by = serializers.IntegerField(source="sold_by_id", read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "batch_id",
            "product_id",
            "drug_id",
            "drug_name",
            "quantity",
            "unit_price",
            "total",
            "sold_by",
            "sold_at",
        ]
        read_only_fields = [
            "id",
            "batch_id",
            "drug_name",
            "unit_price",
            "total",
            "sold_by",
            "sold_at",
        ]

    def validate_quantity(self, value):
        value = int(value)
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value

    def create(self, validated_data):
        product_id = validated_data.pop("product_id", None) or validated_data.pop("drug_id", None)
        if product_id is None:
            raise serializers.ValidationError({"product_id": "This field is required."})

        from core.branch_utils import resolve_branch_id
        from core.services import process_sale

        branch_id = resolve_branch_id(self.context["request"])
        if not Product.objects.filter(pk=product_id).exists():
            raise serializers.ValidationError({"product_id": "Product not found."})

        return process_sale(
            product_id=product_id,
            branch_id=branch_id,
            quantity=validated_data["quantity"],
            sold_by=self.context["request"].user,
        )


class SaleLineInputSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    drug_id = serializers.UUIDField(required=False)
    quantity = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        if not attrs.get("product_id") and attrs.get("drug_id"):
            attrs["product_id"] = attrs.pop("drug_id")
        return attrs


class SaleBatchCreateSerializer(serializers.Serializer):
    items = SaleLineInputSerializer(many=True)
    branch_id = serializers.UUIDField(required=False)

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Add at least one product.")
        return value

    def create(self, validated_data):
        from core.branch_utils import resolve_branch_id
        from core.services import process_sale_batch

        request = self.context["request"]
        branch_id = validated_data.get("branch_id") or resolve_branch_id(request)
        return process_sale_batch(
            items=validated_data["items"],
            branch_id=branch_id,
            sold_by=request.user,
        )


class DashboardStatsSerializer(serializers.Serializer):
    total_drugs = serializers.IntegerField()
    low_stock = serializers.IntegerField()
    expiring_soon = serializers.IntegerField()
    sales_today = serializers.IntegerField()


class SalesReportProductRowSerializer(serializers.Serializer):
    drug_name = serializers.CharField()
    quantity = serializers.IntegerField()
    revenue = serializers.IntegerField()


class SalesReportSaleRowSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    batch_id = serializers.UUIDField(allow_null=True)
    drug_name = serializers.CharField()
    quantity = serializers.IntegerField()
    unit_price = serializers.IntegerField()
    total = serializers.IntegerField()
    sold_at = serializers.DateTimeField()


class SalesReportSerializer(serializers.Serializer):
    period = serializers.CharField()
    title = serializers.CharField()
    report_date = serializers.DateField()
    range_label = serializers.CharField()
    branch_name = serializers.CharField()
    start = serializers.DateField()
    end = serializers.DateField()
    generated_at = serializers.DateTimeField()
    total_revenue = serializers.IntegerField()
    total_items = serializers.IntegerField()
    transaction_count = serializers.IntegerField()
    sales = SalesReportSaleRowSerializer(many=True)
    by_product = SalesReportProductRowSerializer(many=True)


class SalesChartPointSerializer(serializers.Serializer):
    label = serializers.CharField()
    date = serializers.DateField()
    revenue = serializers.IntegerField()


class SalesChartSerializer(serializers.Serializer):
    period = serializers.CharField()
    title = serializers.CharField()
    range_label = serializers.CharField()
    total_revenue = serializers.IntegerField()
    points = SalesChartPointSerializer(many=True)


class StockOrderSerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField(write_only=True)
    drug_id = serializers.UUIDField(write_only=True, required=False)
    requested_by = serializers.IntegerField(source="requested_by_id", read_only=True)

    class Meta:
        model = StockOrder
        fields = [
            "id",
            "product_id",
            "drug_id",
            "drug_name",
            "quantity_requested",
            "quantity_imported",
            "stock_at_request",
            "status",
            "notes",
            "requested_by",
            "requester_name",
            "imported_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "drug_name",
            "quantity_imported",
            "stock_at_request",
            "status",
            "requested_by",
            "requester_name",
            "imported_at",
            "created_at",
            "updated_at",
        ]

    def validate_quantity_requested(self, value):
        value = int(value)
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value

    def validate(self, attrs):
        if not attrs.get("product_id") and attrs.get("drug_id"):
            attrs["product_id"] = attrs.pop("drug_id")
        if not attrs.get("product_id"):
            raise serializers.ValidationError({"product_id": "This field is required."})
        return attrs

    def create(self, validated_data):
        from core.branch_utils import get_branch_or_404, resolve_branch_id
        from core.inventory import get_branch_quantity

        product_id = validated_data.pop("product_id", None) or validated_data.pop("drug_id", None)
        request = self.context["request"]
        user = request.user
        branch_id = resolve_branch_id(request)
        branch = get_branch_or_404(branch_id)

        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            raise serializers.ValidationError({"product_id": "Product not found."}) from None

        if StockOrder.objects.filter(
            product=product, branch=branch, status=StockOrderStatus.PENDING
        ).exists():
            raise serializers.ValidationError(
                {"product_id": "A pending order already exists for this product."}
            )

        profile = getattr(user, "profile", None)
        requester_name = ""
        if profile:
            requester_name = profile.full_name or profile.username or user.email

        return StockOrder.objects.create(
            branch=branch,
            product=product,
            drug_name=product.name,
            stock_at_request=get_branch_quantity(branch, product),
            requested_by=user,
            requester_name=requester_name,
            notes=validated_data.get("notes", ""),
            quantity_requested=validated_data["quantity_requested"],
        )


class StockOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[StockOrderStatus.FULFILLED, StockOrderStatus.CANCELLED]
    )


class StockOrderReceiveSerializer(serializers.Serializer):
    quantity_imported = serializers.IntegerField(min_value=1)

    def validate_quantity_imported(self, value):
        return int(value)


class StockImportSerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField(write_only=True)
    imported_by = serializers.IntegerField(source="imported_by_id", read_only=True)

    class Meta:
        model = StockImport
        fields = [
            "id",
            "product_id",
            "drug_name",
            "quantity",
            "notes",
            "imported_by",
            "importer_name",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "drug_name",
            "importer_name",
            "imported_by",
            "created_at",
        ]

    def validate_quantity(self, value):
        value = int(value)
        if value < 1:
            raise serializers.ValidationError("Quantity must be at least 1.")
        return value

    def create(self, validated_data):
        from core.branch_utils import get_branch_or_404, resolve_branch_id
        from core.inventory import record_direct_import

        product_id = validated_data.pop("product_id")
        request = self.context["request"]
        branch_id = resolve_branch_id(request)
        branch = get_branch_or_404(branch_id)

        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            raise serializers.ValidationError({"product_id": "Product not found."}) from None

        return record_direct_import(
            branch=branch,
            product=product,
            quantity=validated_data["quantity"],
            imported_by=request.user,
            notes=validated_data.get("notes", ""),
        )

