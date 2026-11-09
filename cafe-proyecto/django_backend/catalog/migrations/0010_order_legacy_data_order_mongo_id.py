from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("catalog", "0009_customerprofile_mongo_id")]

    operations = [
        migrations.AddField(
            model_name="order",
            name="legacy_data",
            field=models.JSONField(blank=True, default=dict, editable=False),
        ),
        migrations.AddField(
            model_name="order",
            name="mongo_id",
            field=models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True),
        ),
    ]
