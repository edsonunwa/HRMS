from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('evaluation', '0003_performancereview_self_comment_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='performancereview',
            name='hod_comments',
            field=models.TextField(blank=True, help_text="Department head's comments when confirming or sending back for revision"),
        ),
        migrations.AddField(
            model_name='performancereview',
            name='hod_reviewed_at',
            field=models.DateTimeField(blank=True, help_text='Timestamp when the department head last reviewed the self-assessment', null=True),
        ),
    ]
