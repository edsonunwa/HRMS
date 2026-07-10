# Generated manually to add the audit log table used by the system audit trail.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0002_user_must_change_password'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('username', models.CharField(blank=True, help_text="Snapshot of the actor's username", max_length=50)),
                ('action', models.CharField(choices=[('CREATE', 'Create'), ('UPDATE', 'Update'), ('DELETE', 'Delete'), ('LOGIN', 'Login'), ('LOGOUT', 'Logout'), ('OTHER', 'Other')], max_length=20)),
                ('resource', models.CharField(help_text='e.g. Employee, LeaveRequest, User', max_length=100)),
                ('resource_id', models.IntegerField(blank=True, null=True)),
                ('detail', models.TextField(blank=True, help_text='Human-readable summary of what happened')),
                ('metadata', models.JSONField(blank=True, default=dict, help_text='Extra structured data (changed fields, IP, etc.)')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to='authentication.user')),
            ],
            options={
                'verbose_name': 'Audit Log',
                'verbose_name_plural': 'Audit Logs',
                'ordering': ['-created_at'],
                'db_table': 'auth_audit_logs',
            },
        ),
    ]