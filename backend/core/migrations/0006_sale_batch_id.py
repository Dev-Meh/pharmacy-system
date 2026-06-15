import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_stock_order_receive"),
    ]

    operations = [
        migrations.AddField(
            model_name="sale",
            name="batch_id",
            field=models.UUIDField(blank=True, db_index=True, null=True),
        ),
    ]
