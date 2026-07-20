from django.db import models
from django.conf import settings
from django.db.models import Max
from datetime import datetime


class Department(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    code        = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    parent      = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='sub_departments')
    head        = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='headed_department')
    region      = models.CharField(max_length=50, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    branch = models.ForeignKey('Branch', on_delete=models.CASCADE, related_name='departments', null=True, blank=True)
    class Meta:
        db_table = 'departments'
        ordering = ['name']

    def __str__(self):
        return self.name


class Grade(models.Model):
    level       = models.CharField(max_length=20, unique=True)   # e.g. U1, U2, U3
    title       = models.CharField(max_length=100)
    min_salary  = models.DecimalField(max_digits=14, decimal_places=2)
    max_salary  = models.DecimalField(max_digits=14, decimal_places=2)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'grades'
        ordering = ['level']

    def __str__(self):
        return f'{self.level} — {self.title}'


class Position(models.Model):
    title        = models.CharField(max_length=100)
    department   = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='positions')
    grade        = models.ForeignKey(Grade, null=True, blank=True, on_delete=models.SET_NULL)
    is_active    = models.BooleanField(default=True)
    description  = models.TextField(blank=True)

    class Meta:
        db_table = 'positions'

    def __str__(self):
        return f'{self.title} ({self.department.name})'


class Employee(models.Model):
    GENDER_CHOICES = [('M','Male'), ('F','Female')]
    EMPLOYMENT_STATUS = [
        ('active',      'Active'),
        ('on_leave',    'On Leave'),
        ('suspended',   'Suspended'),
        ('probation',   'Probation'),
        ('terminated',  'Terminated'),
        ('retired',     'Retired'),
    ]
    CONTRACT_CHOICES = [
        ('permanent',   'Permanent'),
        ('contract',    'Contract'),
        ('casual',      'Casual'),
        ('graduate',    'Graduate Trainee'),
        ('intern',      'Intern'),
    ]

    user            = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='employee_profile')
    employee_id     = models.CharField(max_length=20, unique=True)   # e.g. NWSC-2026-0001
    department      = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='employees')
    position        = models.ForeignKey(Position, on_delete=models.PROTECT)
    grade           = models.ForeignKey(Grade, null=True, blank=True, on_delete=models.SET_NULL)
    supervisor      = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='subordinates')

    # Personal
    gender          = models.CharField(max_length=1, choices=GENDER_CHOICES)
    date_of_birth   = models.DateField(null=True, blank=True)
    national_id     = models.CharField(max_length=30, unique=True, blank=True, null=True, default=None)
    tin_number      = models.CharField(max_length=20, blank=True)
    nssf_number     = models.CharField(max_length=20, blank=True)
    nationality     = models.CharField(max_length=50, default='Ugandan')
    address         = models.TextField(blank=True)
    next_of_kin     = models.CharField(max_length=100, blank=True)
    next_of_kin_contact = models.CharField(max_length=20, blank=True)

    # Employment
    employment_status = models.CharField(max_length=20, choices=EMPLOYMENT_STATUS, default='active')
    contract_type   = models.CharField(max_length=20, choices=CONTRACT_CHOICES, default='permanent')
    join_date       = models.DateField()
    confirmation_date = models.DateField(null=True, blank=True)
    termination_date  = models.DateField(null=True, blank=True)
    basic_salary    = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Performance snapshot (updated via signals)
    performance_score  = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    attendance_pct     = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)
    branch = models.ForeignKey('Branch', on_delete=models.PROTECT, related_name='employees', null=True, blank=True)
    
    class Meta:
        db_table = 'employees'
        ordering = ['employee_id']

    def __str__(self):
        return f'{self.employee_id} — {self.user.full_name}'

    @property
    def full_name(self):
        return self.user.full_name

    @classmethod
    def _next_employee_id(cls):
        """Auto-generate employee ID in format NWSC-{YEAR}-{MIN_4_DIGITS}."""
        year = datetime.now().year
        prefix = f'NWSC-{year}-'
        # Find the highest existing sequence number for this year's prefix
        last_id = cls.objects.filter(employee_id__startswith=prefix) \
                             .aggregate(max_id=Max('employee_id'))['max_id']
        if last_id:
            # Extract the numeric suffix after the prefix
            try:
                last_num = int(last_id[len(prefix):])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        # Pad to at least 4 digits — grows unbounded (e.g., 0001, 9999, 10000, 100001)
        return f'{prefix}{next_num:04d}' if next_num < 10000 else f'{prefix}{next_num}'

    @classmethod
    def create_with_user(cls, first_name, last_name, email, extra_user_fields=None, **employee_fields):
        """
        Create an Employee together with a User account.
        
        Args:
            first_name: User's first name
            last_name: User's last name
            email: User's email
            extra_user_fields: Dict of additional User fields (phone, etc.)
            **employee_fields: All other Employee model fields
        
        Returns:
            The created Employee instance
        """
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        employee_id = cls._next_employee_id()
        extra_user = extra_user_fields or {}
        
        user = User.objects.create_user(
            username=employee_id,
            email=email,
            password='123456',
            first_name=first_name,
            last_name=last_name,
            role='employee',
            must_change_password=True,
            **extra_user,
        )
        
        employee = cls.objects.create(
            user=user,
            employee_id=employee_id,
            **employee_fields,
        )
        return employee

    def save(self, *args, **kwargs):
        if not self.employee_id:
            self.employee_id = self._next_employee_id()
        super().save(*args, **kwargs)
    
class Branch(models.Model):
    name       = models.CharField(max_length=100, unique=True)
    code       = models.CharField(max_length=20, unique=True)
    location   = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'branches'
        ordering = ['name']

    def __str__(self):
        return self.name