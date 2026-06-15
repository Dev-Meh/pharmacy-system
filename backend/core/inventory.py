from django.db import transaction

from core.models import Branch, BranchStock, Product


def get_branch_stock(branch: Branch, product: Product) -> BranchStock:
    stock, _ = BranchStock.objects.get_or_create(
        branch=branch,
        product=product,
        defaults={"quantity": 0},
    )
    return stock


def get_branch_quantity(branch: Branch, product: Product) -> int:
    return get_branch_stock(branch, product).quantity


def add_branch_stock(branch: Branch, product: Product, amount: int) -> BranchStock:
    with transaction.atomic():
        stock, _ = BranchStock.objects.select_for_update().get_or_create(
            branch=branch,
            product=product,
            defaults={"quantity": 0},
        )
        stock.quantity += amount
        stock.save(update_fields=["quantity", "updated_at"])
        return stock


def record_direct_import(
    *,
    branch: Branch,
    product: Product,
    quantity: int,
    imported_by,
    notes: str = "",
) -> "StockImport":
    from core.models import StockImport

    quantity = int(quantity)
    if quantity < 1:
        raise ValueError("Quantity must be at least 1.")

    with transaction.atomic():
        stock = add_branch_stock(branch, product, quantity)

        profile = getattr(imported_by, "profile", None)
        importer_name = ""
        if profile:
            importer_name = profile.full_name or profile.username or imported_by.email

        record = StockImport.objects.create(
            branch=branch,
            product=product,
            drug_name=product.name,
            quantity=quantity,
            notes=notes or "",
            imported_by=imported_by,
            importer_name=importer_name,
        )
        return record
