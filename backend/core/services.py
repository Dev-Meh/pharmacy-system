import uuid
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from rest_framework.exceptions import ValidationError

from core.inventory import get_branch_stock
from core.models import Branch, BranchStock, Product, Sale


def _process_sale_line(
    *,
    product_id,
    branch: Branch,
    quantity: int,
    sold_by,
    batch_id: uuid.UUID | None = None,
) -> Sale:
    quantity = int(quantity)
    if quantity < 1:
        raise ValidationError({"quantity": "Quantity must be at least 1."})

    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        raise ValidationError({"product_id": "Product not found."}) from None

    stock = get_branch_stock(branch, product)
    stock = BranchStock.objects.select_for_update().get(pk=stock.pk)

    if stock.quantity < quantity:
        raise ValidationError(
            {"quantity": f"Insufficient stock for {product.name} (available: {stock.quantity})."}
        )

    unit_price = product.price.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    total = (unit_price * quantity).quantize(Decimal("1"), rounding=ROUND_HALF_UP)

    sale = Sale.objects.create(
        batch_id=batch_id,
        product=product,
        branch=branch,
        drug_name=product.name,
        quantity=quantity,
        unit_price=unit_price,
        total=total,
        sold_by=sold_by,
    )

    stock.quantity -= quantity
    stock.save(update_fields=["quantity", "updated_at"])

    return sale


def process_sale(*, product_id, branch_id, quantity: int, sold_by) -> Sale:
    with transaction.atomic():
        try:
            branch = Branch.objects.get(pk=branch_id, is_active=True)
        except Branch.DoesNotExist:
            raise ValidationError({"branch": "Branch not found."}) from None

        return _process_sale_line(
            product_id=product_id,
            branch=branch,
            quantity=quantity,
            sold_by=sold_by,
        )


def process_sale_batch(*, items, branch_id, sold_by) -> list[Sale]:
    if not items:
        raise ValidationError({"items": "At least one product is required."})

    with transaction.atomic():
        try:
            branch = Branch.objects.get(pk=branch_id, is_active=True)
        except Branch.DoesNotExist:
            raise ValidationError({"branch": "Branch not found."}) from None

        totals: dict[str, int] = {}
        for item in items:
            product_id = str(item["product_id"])
            qty = int(item["quantity"])
            if qty < 1:
                raise ValidationError({"quantity": "Quantity must be at least 1."})
            totals[product_id] = totals.get(product_id, 0) + qty

        for product_id, needed in totals.items():
            try:
                product = Product.objects.get(pk=product_id)
            except Product.DoesNotExist:
                raise ValidationError({"product_id": "Product not found."}) from None

            stock = get_branch_stock(branch, product)
            stock = BranchStock.objects.select_for_update().get(pk=stock.pk)
            if stock.quantity < needed:
                raise ValidationError(
                    {
                        "quantity": (
                            f"Insufficient stock for {product.name} "
                            f"(available: {stock.quantity}, requested: {needed})."
                        )
                    }
                )

        batch_id = uuid.uuid4()
        sales: list[Sale] = []
        for item in items:
            sales.append(
                _process_sale_line(
                    product_id=item["product_id"],
                    branch=branch,
                    quantity=item["quantity"],
                    sold_by=sold_by,
                    batch_id=batch_id,
                )
            )
        return sales
