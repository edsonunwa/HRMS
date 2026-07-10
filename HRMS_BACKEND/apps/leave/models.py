from django.db import models
from django.conf import settings
from apps.employees.models import Employee


class LeaveType(models.Model):
    name              = models.CharField(max_length=100, unique=True)
    days_allowed      = models.PositiveIntegerField()
    is_paid           = models.BooleanField(default=True)
    requires_approval = models.BooleanField(default=True)
    carry_forward     = models.BooleanField(default=False)
    max_carry_days    = models.PositiveIntegerField(default=0)
    description       = models.TextField(blank=True)

    class Meta:
        db_table = 'leave_types'

    def __str__(self):
        return self.name


class LeaveBalance(models.Model):
    employee   = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_balances')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    year       = models.PositiveIntegerField()
    total_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    used_days  = models.DecimalField(max_digits=5, decimal_places=1, default=0)

    class Meta:
        db_table = 'leave_balances'
        unique_together = ['employee', 'leave_type', 'year']

    @property
    def remaining_days(self):
        return self.total_days - self.used_days


class LeaveRequest(models.Model):
    STATUS = [
        ('pending',   'Pending'),
        ('approved',  'Approved'),
        ('rejected',  'Rejected'),
        ('cancelled', 'Cancelled'),
        ('recalled',  'Recalled'),
    ]

    employee       = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type     = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    start_date     = models.DateField()
    end_date       = models.DateField()
    days_requested = models.DecimalField(max_digits=5, decimal_places=1)
    reason         = models.TextField(blank=True)
    supporting_doc = models.FileField(upload_to='leave_docs/', null=True, blank=True)
    status         = models.CharField(max_length=20, choices=STATUS, default='pending')
    current_level  = models.PositiveIntegerField(default=1)  # tracks which approval level is next
    applied_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'leave_requests'
        ordering = ['-applied_at']

    def __str__(self):
        return f'{self.employee} — {self.leave_type} ({self.start_date} to {self.end_date})'


class LeaveApproval(models.Model):
    DECISION = [('approved','Approved'),('rejected','Rejected')]

    leave_request = models.ForeignKey(LeaveRequest, on_delete=models.CASCADE, related_name='approvals')
    approver      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    decision      = models.CharField(max_length=20, choices=DECISION)
    comment       = models.TextField(blank=True)
    level         = models.PositiveIntegerField(default=1)  # 1=Supervisor, 2=HR
    decided_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'leave_approvals'
        ordering = ['level']