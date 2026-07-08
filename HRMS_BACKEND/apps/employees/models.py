from django.db import models
from django.conf import settings


class Department(models.Model):
    name        = models.CharField(max_length=100, unique=True)
    code        = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    head        = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='headed_department')
    region      = models.CharField(max_length=50, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'departments'
        ordering = ['name']

    def __str__(self):
        return self.name


class Grade(models.Model):
    level       = models.CharField(max_length=20, unique=True)   # e.g. U1, U2, U3
    min_salary  = models.DecimalField(max_digits=14, decimal_places=2)
    max_salary  = models.DecimalField(max_digits=14, decimal_places=2)
    description = models.TextField(blank=True)

    class Meta:
        db_table = 'grades'
        ordering = ['level']

    def __str__(self):
        return f'{self.level} — {self.max_salary}'


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
    GENDER_CHOICES = [('M','Male'), ('F','Female'), ('O','Other')]
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
    employee_id     = models.CharField(max_length=20, unique=True)   # e.g. NWSC-0124
    department      = models.ForeignKey(Department, on_delete=models.PROTECT, related_name='employees')
    position        = models.ForeignKey(Position, on_delete=models.PROTECT)
    grade           = models.ForeignKey(Grade, null=True, blank=True, on_delete=models.SET_NULL)

    # Personal
    gender          = models.CharField(max_length=1, choices=GENDER_CHOICES)
    date_of_birth   = models.DateField(null=True, blank=True)
    national_id     = models.CharField(max_length=30, unique=True, blank=True)
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

    class Meta:
        db_table = 'employees'
        ordering = ['employee_id']

    def __str__(self):
        return f'{self.employee_id} — {self.user.full_name}'

    @property
    def full_name(self):
        return self.user.full_name