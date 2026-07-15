from django.db import models
from django.conf import settings
from apps.employees.models import Employee, Department, Position


class Transfer(models.Model):
    TYPE   = [("transfer","Transfer"),("rotation","Rotation"),("secondment","Secondment"),("promotion","Promotion")]
    STATUS = [("pending","Pending"),("approved","Approved"),("rejected","Rejected"),("completed","Completed"),("cancelled","Cancelled")]

    employee          = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="transfers")
    transfer_type     = models.CharField(max_length=20, choices=TYPE, default="transfer")
    from_branch = models.ForeignKey('employees.Branch', on_delete=models.SET_NULL, null=True, related_name='transfers_from')
    to_branch   = models.ForeignKey('employees.Branch', on_delete=models.SET_NULL, null=True, related_name='transfers_to')
    from_department   = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="outgoing_transfers")
    to_department     = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="incoming_transfers")
    from_position     = models.ForeignKey(Position, null=True, blank=True, on_delete=models.SET_NULL, related_name="vacated_by")
    to_position       = models.ForeignKey(Position, null=True, blank=True, on_delete=models.SET_NULL, related_name="filled_by")
    effective_date    = models.DateField()
    end_date          = models.DateField(null=True, blank=True)   # for rotations/secondments
    reason            = models.TextField()
    status            = models.CharField(max_length=20, choices=STATUS, default="pending")
    initiated_by      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="initiated_transfers")
    approved_by       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_transfers")
    approval_comment  = models.TextField(blank=True)
    is_hr_record      = models.BooleanField(default=False)  # True when HR/Admin recorded this directly, bypassing the request/approval workflow
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "transfers"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.employee} | {self.from_department} → {self.to_department} ({self.get_status_display()})"