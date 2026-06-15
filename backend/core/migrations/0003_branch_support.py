import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def create_default_branch(apps, schema_editor):
    Branch = apps.get_model("core", "Branch")
    BranchMembership = apps.get_model("core", "BranchMembership")
    Drug = apps.get_model("core", "Drug")
    Sale = apps.get_model("core", "Sale")
    StockOrder = apps.get_model("core", "StockOrder")
    User = apps.get_model(settings.AUTH_USER_MODEL)

    branch, _ = Branch.objects.get_or_create(
        name="Main Branch",
        defaults={
            "id": uuid.uuid4(),
            "address": "",
            "phone": "",
            "is_active": True,
        },
    )

    Drug.objects.filter(branch__isnull=True).update(branch=branch)
    for sale in Sale.objects.filter(branch__isnull=True).select_related("drug"):
        sale.branch_id = sale.drug.branch_id
        sale.save(update_fields=["branch_id"])
    for order in StockOrder.objects.filter(branch__isnull=True).select_related("drug"):
        order.branch_id = order.drug.branch_id
        order.save(update_fields=["branch_id"])

    for user in User.objects.filter(is_superuser=True):
        BranchMembership.objects.get_or_create(
            branch=branch, user=user, defaults={"is_manager": True}
        )

    from core.models import AppRole

    UserRole = apps.get_model("core", "UserRole")
    manager_ids = UserRole.objects.filter(
        role__in=[AppRole.ADMIN, AppRole.STORE_MANAGER]
    ).values_list("user_id", flat=True)
    for user_id in manager_ids:
        BranchMembership.objects.get_or_create(
            branch=branch, user_id=user_id, defaults={"is_manager": True}
        )

    pharmacist_ids = UserRole.objects.filter(role=AppRole.PHARMACIST).values_list(
        "user_id", flat=True
    )
    for user_id in pharmacist_ids:
        BranchMembership.objects.get_or_create(
            branch=branch, user_id=user_id, defaults={"is_manager": False}
        )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_stockorder"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Branch",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                ("address", models.CharField(blank=True, default="", max_length=500)),
                ("phone", models.CharField(blank=True, default="", max_length=50)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_branches",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="BranchMembership",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("is_manager", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "branch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="memberships",
                        to="core.branch",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="branch_memberships",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["branch__name", "user_id"],
                "unique_together": {("branch", "user")},
            },
        ),
        migrations.AddField(
            model_name="drug",
            name="branch",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="drugs",
                to="core.branch",
            ),
        ),
        migrations.AddField(
            model_name="sale",
            name="branch",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="sales",
                to="core.branch",
            ),
        ),
        migrations.AddField(
            model_name="stockorder",
            name="branch",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="stock_orders",
                to="core.branch",
            ),
        ),
        migrations.RunPython(create_default_branch, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="drug",
            name="branch",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="drugs",
                to="core.branch",
            ),
        ),
        migrations.AlterField(
            model_name="sale",
            name="branch",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="sales",
                to="core.branch",
            ),
        ),
        migrations.AlterField(
            model_name="stockorder",
            name="branch",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="stock_orders",
                to="core.branch",
            ),
        ),
        migrations.AlterUniqueTogether(
            name="drug",
            unique_together={("branch", "name")},
        ),
    ]
