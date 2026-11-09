from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("catalog", "0008_customerprofile")]

    operations = [
        migrations.AddField(
            model_name="customerprofile",
            name="mongo_id",
            field=models.CharField(blank=True, editable=False, max_length=24, null=True, unique=True),
        ),
    ]
