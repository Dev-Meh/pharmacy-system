from django.db import migrations, models


def activate_existing_pharmacies(apps, schema_editor):
    Pharmacy = apps.get_model("core", "Pharmacy")
    Pharmacy.objects.all().update(access_status="active")


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_pharmacy_tenant"),
    ]

    operations = [
        migrations.AddField(
            model_name="pharmacy",
            name="access_status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending payment"),
                    ("active", "Active"),
                    ("suspended", "Suspended"),
                ],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="pharmacy",
            name="payment_notes",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="pharmacy",
            name="access_granted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="pharmacy",
            name="access_granted_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name="pharmacy_access_grants",
                to="auth.user",
            ),
        ),
        migrations.RunPython(activate_existing_pharmacies, migrations.RunPython.noop),
    ]
