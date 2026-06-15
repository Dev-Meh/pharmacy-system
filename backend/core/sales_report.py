from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from core.models import Sale

VALID_PERIODS = ("daily", "weekly", "monthly", "annual")


def period_bounds(period: str, anchor: date | None = None) -> tuple[date, date, str]:
    today = anchor or timezone.localdate()

    if period == "daily":
        return today, today, today.strftime("%d %b %Y")

    if period == "weekly":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=6)
        return start, end, f"{start.strftime('%d %b')} – {end.strftime('%d %b %Y')}"

    if period == "monthly":
        start = today.replace(day=1)
        if today.month == 12:
            end = today.replace(day=31)
        else:
            end = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
        return start, end, start.strftime("%B %Y")

    if period == "annual":
        start = today.replace(month=1, day=1)
        end = today.replace(month=12, day=31)
        return start, end, str(today.year)

    raise ValueError(f"Invalid period: {period}")


def _period_label(period: str) -> str:
    labels = {
        "daily": "Daily sales report",
        "weekly": "Weekly sales report",
        "monthly": "Monthly sales report",
        "annual": "Annual sales report",
    }
    return labels.get(period, "Sales report")


def build_sales_report(*, period: str, branch_id, user, anchor: date | None = None) -> dict:
    from core.models import AppRole, Branch
    from core.permissions import user_has_role, user_is_admin_or_manager

    if period not in VALID_PERIODS:
        raise ValueError(f"Invalid period: {period}")

    start, end, range_label = period_bounds(period, anchor)
    anchor_used = anchor or timezone.localdate()
    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(datetime.combine(start, time.min), tz)
    end_dt = timezone.make_aware(datetime.combine(end, time.max), tz)

    qs = Sale.objects.select_related("sold_by").filter(
        branch_id=branch_id,
        sold_at__gte=start_dt,
        sold_at__lte=end_dt,
    )
    if not (
        user.is_superuser
        or user_has_role(user, AppRole.ADMIN)
        or user_is_admin_or_manager(user)
    ):
        qs = qs.filter(sold_by=user)

    sales = list(qs.order_by("-sold_at"))
    branch = Branch.objects.filter(pk=branch_id).first()

    total_revenue = sum((s.total for s in sales), Decimal("0"))
    total_items = sum(s.quantity for s in sales)
    batch_keys = {s.batch_id or s.id for s in sales}

    by_product: dict[str, dict] = {}
    for sale in sales:
        row = by_product.setdefault(
            sale.drug_name,
            {"drug_name": sale.drug_name, "quantity": 0, "revenue": Decimal("0")},
        )
        row["quantity"] += sale.quantity
        row["revenue"] += sale.total

    product_rows = sorted(
        by_product.values(),
        key=lambda r: (-int(r["revenue"]), r["drug_name"]),
    )

    return {
        "period": period,
        "title": _period_label(period),
        "report_date": anchor_used.isoformat(),
        "range_label": range_label,
        "branch_name": branch.name if branch else "",
        "start": start.isoformat(),
        "end": end.isoformat(),
        "generated_at": timezone.now().isoformat(),
        "total_revenue": int(total_revenue.quantize(Decimal("1"))),
        "total_items": total_items,
        "transaction_count": len(batch_keys),
        "sales": [
            {
                "id": str(s.id),
                "batch_id": str(s.batch_id) if s.batch_id else None,
                "drug_name": s.drug_name,
                "quantity": s.quantity,
                "unit_price": int(s.unit_price.quantize(Decimal("1"))),
                "total": int(s.total.quantize(Decimal("1"))),
                "sold_at": s.sold_at.isoformat(),
            }
            for s in sales
        ],
        "by_product": [
            {
                "drug_name": row["drug_name"],
                "quantity": row["quantity"],
                "revenue": int(row["revenue"].quantize(Decimal("1"))),
            }
            for row in product_rows
        ],
    }
