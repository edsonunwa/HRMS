from django.db.models import Avg, Count
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.evaluation.models import (
    KPI,
    PerformanceCycle,
    PerformanceReview,
)
from apps.employees.models import Employee


class PerformanceDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):

        active_cycle = (
            PerformanceCycle.objects
            .filter(is_active=True)
            .first()
        )

        completed_reviews = (
            PerformanceReview.objects
            .exclude(overall_score=None)
            .count()
        )

        average_score = (
            PerformanceReview.objects
            .aggregate(avg=Avg("overall_score"))
            .get("avg")
        ) or 0

        total_kpis = KPI.objects.count()

        review_status = (
            PerformanceReview.objects
            .values("status")
            .annotate(total=Count("id"))
        )

        status_data = {
            "pending": 0,
            "self_assessed": 0,
            "reviewed": 0,
            "moderated": 0,
            "approved": 0,
        }

        for item in review_status:
            status_data[item["status"]] = item["total"]

        trend = []

        for month in range(1, 13):
            avg = (
                PerformanceReview.objects
                .filter(created_at__month=month)
                .aggregate(avg=Avg("overall_score"))
                .get("avg")
            )

            trend.append({
                "month": [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                ][month - 1],
                "score": float(avg) if avg else 0,
            })

        departments = []

        for dept in (
            Employee.objects
            .values(
                "departmentid__departmentname"
            )
            .annotate(
                avg=Avg("reviews__overall_score")
            )
        ):

            departments.append({
                "department": dept["departmentid__departmentname"],
                "score": round(float(dept["avg"] or 0), 2),
            })

        return Response({
            "summary": {
                "average_score": round(float(average_score), 2),
                "completed_reviews": completed_reviews,
                "active_cycle": (
                    active_cycle.name
                    if active_cycle
                    else "None"
                ),
                "total_kpis": total_kpis,
            },
            "review_status": status_data,
            "trend": trend,
            "departments": departments,
        })