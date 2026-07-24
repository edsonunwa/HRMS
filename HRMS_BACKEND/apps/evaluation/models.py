from django.db import models
from django.conf import settings
from apps.employees.models import Employee


class PerformanceCycle(models.Model):
    name       = models.CharField(max_length=100)   # e.g. "2024 Annual Review"
    year       = models.PositiveIntegerField()
    period     = models.CharField(max_length=20, choices=[("annual","Annual"),("q1","Q1"),("q2","Q2"),("q3","Q3"),("q4","Q4")], default="annual")
    start_date = models.DateField()
    end_date   = models.DateField()
    is_active  = models.BooleanField(default=True)

    class Meta:
        db_table = "performance_cycles"

    def __str__(self):
        return self.name


class KPI(models.Model):
    WEIGHT_CHOICES = [(i, str(i)) for i in range(5, 105, 5)]

    cycle        = models.ForeignKey(PerformanceCycle, on_delete=models.CASCADE, related_name="kpis")
    employee     = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="kpis")
    description  = models.TextField()
    target       = models.TextField()
    weight       = models.PositiveIntegerField(default=20)
    self_score   = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    appraiser_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    evidence     = models.TextField(blank=True)
    comments     = models.TextField(blank=True)

    class Meta:
        db_table = "kpis"


class PerformanceReview(models.Model):
    STATUS = [
        ("pending","Pending"),
        ("self_assessed","Self Assessed"),
        ("pending_hr_review","Pending HR Review"),
        ("reviewed","Reviewed"),
        ("moderated","Moderated"),
        ("approved","Approved"),
    ]

    cycle         = models.ForeignKey(PerformanceCycle, on_delete=models.CASCADE, related_name="reviews")
    employee      = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="reviews")
    appraiser     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="conducted_reviews")
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    grade         = models.CharField(max_length=5, blank=True)   # A, B, C etc
    self_comments = models.TextField(blank=True)
    appraiser_comments = models.TextField(blank=True)
    status        = models.CharField(max_length=20, choices=STATUS, default="pending")
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    # Manager ratings (1-5 scale)
    communication_score   = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Manager rating: Communication (1-5)")
    productivity_score    = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Manager rating: Productivity (1-5)")
    innovation_score      = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Manager rating: Innovation (1-5)")
    manager_comment       = models.TextField(blank=True, help_text="Manager's overall comment on the employee")

    # Self ratings (1-5 scale)
    self_communication_score = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Self rating: Communication (1-5)")
    self_productivity_score  = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Self rating: Productivity (1-5)")
    self_innovation_score    = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Self rating: Innovation (1-5)")
    self_comment             = models.TextField(blank=True, help_text="Employee's self-rating comment")

    # Department Head review
    hod_comments             = models.TextField(blank=True, help_text="Department head's comments when confirming or sending back for revision")
    hod_reviewed_at          = models.DateTimeField(null=True, blank=True, help_text="Timestamp when the department head last reviewed the self-assessment")

    class Meta:
        db_table = "performance_reviews"
        unique_together = ["cycle", "employee"]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.employee} — {self.cycle.name}"


class JobEvaluation(models.Model):
    """Job grading/evaluation — separate from performance."""
    STATUS = [("pending","Pending"),("evaluated","Evaluated"),("approved","Approved")]

    position      = models.ForeignKey("employees.Position", on_delete=models.CASCADE, related_name="evaluations")
    evaluated_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    criteria      = models.JSONField(default=dict)   # {"skill":30, "effort":20, "responsibility":30, "conditions":20}
    total_score   = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    recommended_grade = models.ForeignKey("employees.Grade", null=True, blank=True, on_delete=models.SET_NULL)
    status        = models.CharField(max_length=20, choices=STATUS, default="pending")
    notes         = models.TextField(blank=True)
    evaluated_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "job_evaluations"
        ordering = ["-evaluated_at"]