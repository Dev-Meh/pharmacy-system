import uuid

from django.db import migrations, models
import django.db.models.deletion


def migrate_drugs_to_products(apps, schema_editor):
    Drug = apps.get_model("core", "Drug")
    Product = apps.get_model("core", "Product")
    BranchStock = apps.get_model("core", "BranchStock")
    Sale = apps.get_model("core", "Sale")
    StockOrder = apps.get_model("core", "StockOrder")

    product_by_name = {}
    drug_to_product = {}

    for drug in Drug.objects.select_related("branch").order_by("name", "created_at"):
        name_key = drug.name.strip().lower()
        if name_key not in product_by_name:
            product = Product.objects.create(
                id=uuid.uuid4(),
                name=drug.name,
                category=drug.category,
                price=drug.price,
                expiry_date=drug.expiry_date,
                supplier=drug.supplier,
            )
            product_by_name[name_key] = product
        product = product_by_name[name_key]
        drug_to_product[drug.id] = product

        BranchStock.objects.update_or_create(
            branch_id=drug.branch_id,
            product=product,
            defaults={"quantity": drug.quantity},
        )

    for sale in Sale.objects.all():
        product = drug_to_product.get(sale.drug_id)
        if product:
            sale.product_id = product.id
            sale.save(update_fields=["product_id"])

    for order in StockOrder.objects.all():
        product = drug_to_product.get(order.drug_id)
        if product:
            order.product_id = product.id
            order.save(update_fields=["product_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_branch_support"),
    ]

    operations = [
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=255, unique=True)),
                ("category", models.CharField(default="General", max_length=100)),
                ("price", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("expiry_date", models.DateField(blank=True, null=True)),
                ("supplier", models.CharField(blank=True, max_length=255, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="BranchStock",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("quantity", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="stock_items", to="core.branch")),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="branch_stocks", to="core.product")),
            ],
            options={
                "ordering": ["product__name"],
                "unique_together": {("branch", "product")},
            },
        ),
        migrations.AddField(
            model_name="sale",
            name="product",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.RESTRICT, related_name="sales", to="core.product"),
        ),
        migrations.AddField(
            model_name="stockorder",
            name="product",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name="stock_orders", to="core.product"),
        ),
        migrations.RunPython(migrate_drugs_to_products, migrations.RunPython.noop),
        migrations.RemoveField(model_name="sale", name="drug"),
        migrations.RemoveField(model_name="stockorder", name="drug"),
        migrations.AlterField(
            model_name="sale",
            name="product",
            field=models.ForeignKey(on_delete=django.db.models.deletion.RESTRICT, related_name="sales", to="core.product"),
        ),
        migrations.AlterField(
            model_name="stockorder",
            name="product",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="stock_orders", to="core.product"),
        ),
        migrations.DeleteModel(name="Drug"),
    ]
