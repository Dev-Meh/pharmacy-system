from django.db import migrations, models
import django.db.models.deletion


def backfill_profile_pharmacy(apps, schema_editor):
    Profile = apps.get_model("core", "Profile")
    BranchMembership = apps.get_model("core", "BranchMembership")
    Pharmacy = apps.get_model("core", "Pharmacy")

    for membership in BranchMembership.objects.select_related("branch").iterator():
        if not membership.branch_id or not membership.branch.pharmacy_id:
            continue
        Profile.objects.filter(user_id=membership.user_id, pharmacy__isnull=True).update(
            pharmacy_id=membership.branch.pharmacy_id
        )

    for pharmacy in Pharmacy.objects.iterator():
        Profile.objects.filter(user_id=pharmacy.manager_id, pharmacy__isnull=True).update(
            pharmacy_id=pharmacy.pk
        )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_pharmacy_access_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="pharmacy",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="staff_profiles",
                to="core.pharmacy",
            ),
        ),
        migrations.RunPython(backfill_profile_pharmacy, migrations.RunPython.noop),
    ]
