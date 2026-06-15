from django.contrib import admin

from core.models import (
    Branch,
    BranchMembership,
    BranchStock,
    Pharmacy,
    Product,
    Profile,
    Sale,
    StockImport,
    StockOrder,
    UserRole,
)


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["full_name", "username", "user"]
    search_fields = ["full_name", "username", "user__email"]


@admin.register(UserRole)
class UserRoleAdmin(admin.ModelAdmin):
    list_display = ["user", "role", "created_at"]
    list_filter = ["role"]


@admin.register(Pharmacy)
class PharmacyAdmin(admin.ModelAdmin):
    list_display = ["name", "manager", "access_status", "is_active", "phone", "created_at"]
    search_fields = ["name", "manager__email"]
    list_filter = ["access_status", "is_active"]


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ["name", "phone", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "address"]


@admin.register(BranchMembership)
class BranchMembershipAdmin(admin.ModelAdmin):
    list_display = ["branch", "user", "is_manager", "created_at"]
    list_filter = ["is_manager"]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "price", "expiry_date"]
    search_fields = ["name", "category", "supplier"]
    list_filter = ["category"]


@admin.register(BranchStock)
class BranchStockAdmin(admin.ModelAdmin):
    list_display = ["product", "branch", "quantity", "updated_at"]
    list_filter = ["branch"]
    search_fields = ["product__name"]


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ["drug_name", "branch", "quantity", "total", "sold_by", "sold_at"]
    list_filter = ["sold_at", "branch"]
    search_fields = ["drug_name"]
    readonly_fields = ["drug_name", "unit_price", "total", "sold_at"]


@admin.register(StockOrder)
class StockOrderAdmin(admin.ModelAdmin):
    list_display = ["drug_name", "branch", "quantity_requested", "status", "requester_name", "created_at"]
    list_filter = ["status", "branch"]
    search_fields = ["drug_name", "requester_name"]


@admin.register(StockImport)
class StockImportAdmin(admin.ModelAdmin):
    list_display = ["drug_name", "branch", "quantity", "importer_name", "created_at"]
    list_filter = ["branch", "created_at"]
    search_fields = ["drug_name", "importer_name"]
