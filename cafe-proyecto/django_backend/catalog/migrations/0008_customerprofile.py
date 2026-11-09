import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0007_guestreservation_mongo_id"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CustomerProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("phone", models.CharField(blank=True, max_length=30, verbose_name="teléfono")),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="cafe_profile", to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
