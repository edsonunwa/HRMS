from django.db.models import Avg, Count, Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.authentication.models import ROLES
from apps.evaluation.models import (
    KPI,
    PerformanceCycle,
    PerformanceReview,
)
from apps.employees.models import Employee


class PerformanceDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # ── Base queryset filtered by role ───────────────────────────────
        if user.role in (ROLES.ADMIN, ROLES.HR_OFFICER, ROLES.HR_DIRECTOR):
            review_qs = PerformanceReview.objects.all()
            kpi_qs = KPI.objects.all()
        elif user.role == ROLES.DEPARTMENT_HEAD:
            profile = user.get_employee_profile()
            if profile is None:
                review_qs = PerformanceReview.objects.none()
                kpi_qs = KPI.objects.none()
            else:
                review_qs = PerformanceReview.objects.filter(employee__department=profile.department)
                kpi_qs = KPI.objects.filter(employee__department=profile.department)
        else:
            profile = user.get_employee_profile()
            if profile is None:
                review_qs = PerformanceReview.objects.none()
                kpi_qs = KPI.objects.none()
            else:
                review_qs = PerformanceReview.objects.filter(employee=profile)
                kpi_qs = KPI.objects.filter(employee=profile)

        # ── Active cycle (HR/Admin only) ────────────────────────────────
        if user.role in (ROLES.ADMIN, ROLES.HR_OFFICER, ROLES.HR_DIRECTOR):
            active_cycle = PerformanceCycle.objects.filter(is_active=True).first()
        else:
            active_cycle = None

        # ── Summary ─────────────────────────────────────────────────────
        completed_reviews = review_qs.exclude(overall_score=None).count()
        average_score = review_qs.aggregate(avg=Avg("overall_score")).get("avg") or 0
        total_kpis = kpi_qs.count()

        # ── Review Status Breakdown ─────────────────────────────────────
        review_status = review_qs.values("status").annotate(total=Count("id"))
        status_data = {
            "pending": 0,
            "self_assessed": 0,
            "reviewed": 0,
            "moderated": 0,
            "approved": 0,
        }
        for item in review_status:
            status_data[item["status"]] = item["total"]

        # ── Trend (department head sees own dept, employee sees self) ───
        trend = []
        for month in range(1, 13):
            month_qs = review_qs.filter(created_at__month=month)
            avg = month_qs.aggregate(avg=Avg("overall_score")).get("avg")
            trend.append({
                "month": [
                    "Jan","Feb","Mar","Apr","May","Jun",
                    "Jul","Aug","Sep","Oct","Nov","Dec",
                ][month - 1],
                "score": float(avg) if avg else 0,
            })

        # ── Departments (only HR/Admin see all departments) ─────────────
        if user.role in (ROLES.ADMIN, ROLES.HR_OFFICER, ROLES.HR_DIRECTOR):
            dept_qs = Employee.objects.values("department__name").annotate(
                avg=Avg("reviews__overall_score")
            )
            departments = [
                {
                    "department": dept["department__name"],
                    "score": round(float(dept["avg"] or 0), 2),
                }
                for dept in dept_qs
            ]
        else:
            profile = user.get_employee_profile()
            if profile and profile.department:
                dept_name = profile.department.name
                dept_avg = Employee.objects.filter(department=profile.department).aggregate(
                    avg=Avg("reviews__overall_score")
                ).get("avg") or 0
                departments = [{"department": dept_name, "score": round(float(dept_avg), 2)}]
            else:
                departments = []

        return Response({
            "summary": {
                "average_score": round(float(average_score), 2),
                "completed_reviews": completed_reviews,
                "active_cycle": active_cycle.name if active_cycle else "None",
                "total_kpis": total_kpis,
                "user_role": user.role,
            },
            "review_status": status_data,
            "trend": trend,
            "departments": departments,
        })
