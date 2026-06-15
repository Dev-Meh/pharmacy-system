from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_fulfilled_to_received(apps, schema_editor):
    StockOrder = apps.get_model("core", "StockOrder")
    for order in StockOrder.objects.filter(status="fulfilled"):
        order.quantity_imported = order.quantity_requested
        order.status = "received"
        order.save(update_fields=["quantity_imported", "status"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_product_catalog"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="stockorder",
            name="imported_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="stockorder",
            name="imported_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="stock_imports",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="stockorder",
            name="quantity_imported",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="stockorder",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("fulfilled", "Fulfilled"),
                    ("received", "Received"),
                    ("cancelled", "Cancelled"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.RunPython(migrate_fulfilled_to_received, migrations.RunPython.noop),
    ]
