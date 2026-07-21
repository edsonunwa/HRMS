from django.db import migrations


def create_procurement_logistics_data(apps, schema_editor):
    Department = apps.get_model('employees', 'Department')
    Position = apps.get_model('employees', 'Position')

    department, created = Department.objects.get_or_create(
        name='Procurement & Logistics',
        defaults={
            'code': 'PROC-LOG',
            'description': 'Handles procurement, logistics, warehouse, inventory, and fleet management.'
        }
    )

    positions = [
        'Procurement & Logistics Manager',
        'Procurement Officer',
        'Logistics Officer',
        'Warehouse Officer',
        'Inventory Officer',
        'Fleet Officer',
    ]

    for title in positions:
        Position.objects.get_or_create(
            title=title,
            department=department,
            defaults={'is_active': True}
        )


def remove_procurement_logistics_data(apps, schema_editor):
    Department = apps.get_model('employees', 'Department')
    Position = apps.get_model('employees', 'Position')

    department = Department.objects.filter(name='Procurement & Logistics').first()
    if department:
        Position.objects.filter(department=department).delete()
        department.delete()


class Migration(migrations.Migration):
    dependencies = [
        ('employees', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_procurement_logistics_data, remove_procurement_logistics_data),
    ]