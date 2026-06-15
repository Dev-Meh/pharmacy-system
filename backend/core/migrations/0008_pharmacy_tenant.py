import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def bootstrap_default_pharmacy(apps, schema_editor):
    User = apps.get_model(settings.AUTH_USER_MODEL)
    Pharmacy = apps.get_model("core", "Pharmacy")
    Branch = apps.get_model("core", "Branch")
    Product = apps.get_model("core", "Product")
    UserRole = apps.get_model("core", "UserRole")

    if Pharmacy.objects.exists():
        return

    manager = (
        User.objects.filter(role_assignments__role="store_manager").first()
        or User.objects.filter(is_superuser=True).first()
        or User.objects.first()
    )
    if not manager:
        return

    admin = User.objects.filter(role_assignments__role="admin").first()
    pharmacy = Pharmacy.objects.create(
        id=uuid.uuid4(),
        name="MediCore Pharmacy",
        manager=manager,
        created_by=admin,
        is_active=True,
    )
    Branch.objects.filter(pharmacy__isnull=True).update(pharmacy=pharmacy)
    Product.objects.filter(pharmacy__isnull=True).update(pharmacy=pharmacy)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0007_stock_import"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Pharmacy",
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
                (
                    "logo",
                    models.ImageField(blank=True, null=True, upload_to="pharmacy_logos/"),
                ),
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
                        related_name="registered_pharmacies",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "manager",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="managed_pharmacy",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "pharmacies",
                "ordering": ["name"],
            },
        ),
        migrations.AddField(
            model_name="branch",
            name="pharmacy",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="branches",
                to="core.pharmacy",
            ),
        ),
        migrations.AddField(
            model_name="product",
            name="pharmacy",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="products",
                to="core.pharmacy",
            ),
        ),
        migrations.AlterField(
            model_name="product",
            name="name",
            field=models.CharField(max_length=255),
        ),
        migrations.RunPython(bootstrap_default_pharmacy, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="product",
            constraint=models.UniqueConstraint(
                fields=("pharmacy", "name"),
                name="unique_product_name_per_pharmacy",
            ),
        ),
    ]
