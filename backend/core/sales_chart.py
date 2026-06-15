from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone

from core.models import AppRole, Sale
from core.permissions import user_has_role, user_is_admin_or_manager

VALID_CHART_PERIODS = ("7d", "30d", "12m")


def _sales_queryset(*, branch_id, user):
    qs = Sale.objects.filter(branch_id=branch_id)
    if not (
        user.is_superuser
        or user_has_role(user, AppRole.ADMIN)
        or user_is_admin_or_manager(user)
    ):
        qs = qs.filter(sold_by=user)
    return qs


def _int_total(value) -> int:
    if value is None:
        return 0
    return int(Decimal(value).quantize(Decimal("1")))


def build_sales_chart(*, branch_id, user, period: str = "30d") -> dict:
    if period not in VALID_CHART_PERIODS:
        raise ValueError(f"Invalid period: {period}")

    today = timezone.localdate()
    qs = _sales_queryset(branch_id=branch_id, user=user)
    points: list[dict] = []

    if period == "7d":
        start = today - timedelta(days=6)
        agg = {
            row["bucket"]: row
            for row in qs.filter(sold_at__date__gte=start, sold_at__date__lte=today)
            .annotate(bucket=TruncDate("sold_at"))
            .values("bucket")
            .annotate(revenue=Sum("total"))
        }
        for i in range(7):
            d = start + timedelta(days=i)
            row = agg.get(d)
            points.append(
                {
                    "label": d.strftime("%a %d"),
                    "date": d.isoformat(),
                    "revenue": _int_total(row["revenue"] if row else None),
                }
            )
        range_label = f"{start.strftime('%d %b')} – {today.strftime('%d %b %Y')}"

    elif period == "30d":
        start = today - timedelta(days=29)
        agg = {
            row["bucket"]: row
            for row in qs.filter(sold_at__date__gte=start, sold_at__date__lte=today)
            .annotate(bucket=TruncDate("sold_at"))
            .values("bucket")
            .annotate(revenue=Sum("total"))
        }
        for i in range(30):
            d = start + timedelta(days=i)
            row = agg.get(d)
            points.append(
                {
                    "label": d.strftime("%d %b"),
                    "date": d.isoformat(),
                    "revenue": _int_total(row["revenue"] if row else None),
                }
            )
        range_label = f"{start.strftime('%d %b')} – {today.strftime('%d %b %Y')}"

    else:
        # Last 12 calendar months including current month
        months: list[date] = []
        cursor = today.replace(day=1)
        for _ in range(11):
            months.append(cursor)
            if cursor.month == 1:
                cursor = cursor.replace(year=cursor.year - 1, month=12)
            else:
                cursor = cursor.replace(month=cursor.month - 1)
        months.reverse()

        start_month = months[0]
        agg = {
            row["bucket"]: row
            for row in qs.filter(sold_at__date__gte=start_month)
            .annotate(bucket=TruncMonth("sold_at"))
            .values("bucket")
            .annotate(revenue=Sum("total"))
        }
        for month_start in months:
            row = agg.get(month_start)
            points.append(
                {
                    "label": month_start.strftime("%b %Y"),
                    "date": month_start.isoformat(),
                    "revenue": _int_total(row["revenue"] if row else None),
                }
            )
        range_label = f"{months[0].strftime('%b %Y')} – {months[-1].strftime('%b %Y')}"

    total_revenue = sum(p["revenue"] for p in points)
    period_labels = {
        "7d": "Last 7 days",
        "30d": "Last 30 days",
        "12m": "Last 12 months",
    }

    return {
        "period": period,
        "title": period_labels[period],
        "range_label": range_label,
        "total_revenue": total_revenue,
        "points": points,
    }
