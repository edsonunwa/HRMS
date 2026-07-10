from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('leave', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='leaverequest',
            name='current_level',
            field=models.PositiveIntegerField(default=1),
        ),
    ]
