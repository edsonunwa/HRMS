from django.db.models import Avg, Count, Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import JobEvaluation, PerformanceReview, KPI, PerformanceCycle
from apps.employees.models import Employee


class EvaluationDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # ── Job Evaluation Status Breakdown ──────────────────────────────
        eval_status = (
            JobEvaluation.objects
            .values("status")
            .annotate(total=Count("id"))
        )

        status_data = {
            "pending": 0,
            "evaluated": 0,
            "approved": 0,
        }
        for item in eval_status:
            status_data[item["status"]] = item["total"]

        total_evaluations = sum(status_data.values())

        # ── Average Score by Position (top 10) ───────────────────────────
        position_scores = (
            JobEvaluation.objects
            .exclude(total_score=None)
            .values("position__title")
            .annotate(avg_score=Avg("total_score"))
            .order_by("-avg_score")[:10]
        )

        positions = [
            {
                "position": item["position__title"],
                "score": round(float(item["avg_score"]), 2),
            }
            for item in position_scores
        ]

        # ── Score Distribution (buckets) ─────────────────────────────────
        buckets = {
            "0-20": 0,
            "21-40": 0,
            "41-60": 0,
            "61-80": 0,
            "81-100": 0,
        }

        all_scores = JobEvaluation.objects.exclude(total_score=None).values_list("total_score", flat=True)
        for score in all_scores:
            s = float(score)
            if s <= 20:
                buckets["0-20"] += 1
            elif s <= 40:
                buckets["21-40"] += 1
            elif s <= 60:
                buckets["41-60"] += 1
            elif s <= 80:
                buckets["61-80"] += 1
            else:
                buckets["81-100"] += 1

        score_distribution = [
            {"range": k, "count": v}
            for k, v in buckets.items()
        ]

        # ── Overall Average Score ────────────────────────────────────────
        overall_avg = (
            JobEvaluation.objects
            .aggregate(avg=Avg("total_score"))
            .get("avg")
        ) or 0

        # ── Evaluations by Department ────────────────────────────────────
        dept_evaluations = (
            JobEvaluation.objects
            .exclude(total_score=None)
            .values("position__department__name")
            .annotate(
                avg_score=Avg("total_score"),
                count=Count("id"),
            )
            .order_by("-avg_score")
        )

        departments = [
            {
                "department": item["position__department__name"],
                "avg_score": round(float(item["avg_score"]), 2),
                "count": item["count"],
            }
            for item in dept_evaluations
        ]

        return Response({
            "summary": {
                "total_evaluations": total_evaluations,
                "overall_avg_score": round(float(overall_avg), 2),
                "pending": status_data["pending"],
                "evaluated": status_data["evaluated"],
                "approved": status_data["approved"],
            },
            "status_breakdown": status_data,
            "position_scores": positions,
            "score_distribution": score_distribution,
            "departments": departments,
        })