import uuid

from django.conf import settings
from django.db import models


class AppRole(models.TextChoices):
    ADMIN = "admin", "Admin"
    PHARMACIST = "pharmacist", "Pharmacist"
    STORE_MANAGER = "store_manager", "Store Manager"


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
        primary_key=True,
    )
    full_name = models.CharField(max_length=255, blank=True, default="")
    username = models.CharField(max_length=150, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name", "username"]

    def __str__(self):
        return self.full_name or self.username or str(self.user_id)


class UserRole(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="role_assignments",
    )
    role = models.CharField(max_length=20, choices=AppRole.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "role")]
        ordering = ["user_id", "role"]

    def __str__(self):
        return f"{self.user_id} — {self.role}"


class Branch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pharmacy = models.ForeignKey(
        "Pharmacy",
        on_delete=models.CASCADE,
        related_name="branches",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=500, blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_branches",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class BranchMembership(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        Branch, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="branch_memberships",
    )
    is_manager = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("branch", "user")]
        ordering = ["branch__name", "user_id"]

    def __str__(self):
        role = "manager" if self.is_manager else "staff"
        return f"{self.user_id} @ {self.branch.name} ({role})"


class Pharmacy(models.Model):
    """A pharmacy tenant — registered by the platform administrator."""

    class AccessStatus(models.TextChoices):
        PENDING = "pending", "Pending payment"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to="pharmacy_logos/", blank=True, null=True)
    address = models.CharField(max_length=500, blank=True, default="")
    phone = models.CharField(max_length=50, blank=True, default="")
    manager = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="managed_pharmacy",
    )
    access_status = models.CharField(
        max_length=20,
        choices=AccessStatus.choices,
        default=AccessStatus.PENDING,
    )
    payment_notes = models.TextField(blank=True, default="")
    access_granted_at = models.DateTimeField(null=True, blank=True)
    access_granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pharmacy_access_grants",
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registered_pharmacies",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "pharmacies"

    def __str__(self):
        return self.name


class Product(models.Model):
    """Product catalog scoped to a pharmacy."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pharmacy = models.ForeignKey(
        Pharmacy,
        on_delete=models.CASCADE,
        related_name="products",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, default="General")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    expiry_date = models.DateField(null=True, blank=True)
    supplier = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["pharmacy", "name"],
                name="unique_product_name_per_pharmacy",
            ),
        ]

    def __str__(self):
        return self.name


class BranchStock(models.Model):
    """Per-branch stock quantity for a catalog product."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        Branch, on_delete=models.CASCADE, related_name="stock_items"
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="branch_stocks"
    )
    quantity = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("branch", "product")]
        ordering = ["product__name"]

    def __str__(self):
        return f"{self.product.name} @ {self.branch.name}: {self.quantity}"


class Sale(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch_id = models.UUIDField(null=True, blank=True, db_index=True)
    branch = models.ForeignKey(
        Branch, on_delete=models.CASCADE, related_name="sales"
    )
    product = models.ForeignKey(Product, on_delete=models.RESTRICT, related_name="sales")
    drug_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    sold_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sales",
    )
    sold_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-sold_at"]

    def __str__(self):
        return f"{self.drug_name} x{self.quantity}"


class StockOrderStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    FULFILLED = "fulfilled", "Fulfilled"
    RECEIVED = "received", "Received"
    CANCELLED = "cancelled", "Cancelled"


class StockOrder(models.Model):
    """Reorder request — manager approves, pharmacist records import at branch."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        Branch, on_delete=models.CASCADE, related_name="stock_orders"
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="stock_orders"
    )
    drug_name = models.CharField(max_length=255)
    quantity_requested = models.PositiveIntegerField()
    quantity_imported = models.PositiveIntegerField(null=True, blank=True)
    stock_at_request = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20,
        choices=StockOrderStatus.choices,
        default=StockOrderStatus.PENDING,
    )
    notes = models.TextField(blank=True, default="")
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="stock_orders",
    )
    requester_name = models.CharField(max_length=255, blank=True, default="")
    imported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stock_imports",
    )
    imported_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order {self.drug_name} x{self.quantity_requested} ({self.status})"


class StockImport(models.Model):
    """Direct branch stock add — no reorder workflow required."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        Branch, on_delete=models.CASCADE, related_name="stock_imports"
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="direct_imports"
    )
    drug_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField()
    notes = models.TextField(blank=True, default="")
    imported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="direct_stock_imports",
    )
    importer_name = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Import {self.drug_name} x{self.quantity} @ {self.branch.name}"
