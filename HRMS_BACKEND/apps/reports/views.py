from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Q, Avg, Sum
from django.http import HttpResponse
from datetime import date

from .models import Report
from .serializers import ReportSerializer
from .report_engine import generate_report, REPORT_LABELS, REPORT_PARAMETERS
from apps.authentication.permissions import IsHROrAdmin, IsManagement
from apps.employees.models import Employee, Department
from apps.leave.models import LeaveRequest, LeaveType
from apps.recruitment.models import JobPosting, JobApplication
from apps.evaluation.models import PerformanceCycle, PerformanceReview
from apps.transfers.models import Transfer
from apps.manpower.models import ManpowerPlan
from apps.trainees.models import TrainingProgram, Trainee


class ReportListView(generics.ListAPIView):
    queryset           = Report.objects.all()
    serializer_class   = ReportSerializer
    permission_classes = [IsHROrAdmin]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["report_type","format"]


# ── Report types / parameters metadata ───────────────────────────────────────

class ReportTypesView(APIView):
    """GET /api/reports/types/ — returns available report types + their filter params."""
    permission_classes = [IsHROrAdmin]

    def get(self, request):
        types = []
        for key, label in REPORT_LABELS.items():
            types.append({
                "value": key,
                "label": label,
                "parameters": REPORT_PARAMETERS.get(key, []),
            })
        return Response(types)


# ── Report generation & download ─────────────────────────────────────────────

class ReportGenerateView(APIView):
    """POST /api/reports/generate/ — generate and download a report file."""
    permission_classes = [IsHROrAdmin]

    def post(self, request):
        report_type = request.data.get("report_type")
        report_format = request.data.get("format", "csv")
        parameters = request.data.get("parameters", {})

        if report_type not in REPORT_LABELS:
            return Response(
                {"error": f"Unknown report type '{report_type}'. "
                          f"Available: {', '.join(REPORT_LABELS.keys())}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if report_format not in ("csv", "excel", "pdf"):
            return Response(
                {"error": "Format must be 'csv', 'excel', or 'pdf'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            content, filename, content_type = generate_report(
                report_type, report_format, parameters
            )
        except Exception as e:
            return Response(
                {"error": f"Report generation failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Save a record of the generated report
        Report.objects.create(
            title=f"{REPORT_LABELS.get(report_type, report_type)} ({date.today()})",
            report_type=report_type,
            format=report_format,
            parameters=parameters,
            generated_by=request.user,
        )

        response = HttpResponse(content, content_type=content_type)
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


# ── Analytical summary endpoints ─────────────────────────────────────────────

class HeadcountSummaryView(APIView):
    """GET /api/reports/headcount/ — total staff, by department, by gender."""
    permission_classes = [IsManagement]

    def get(self, request):
        total      = Employee.objects.filter(employment_status="active").count()
        by_dept    = list(Department.objects.annotate(
            active=Count("employees", filter=Q(employees__employment_status="active"))
        ).values("name","active").order_by("-active"))
        by_gender  = list(Employee.objects.filter(employment_status="active")
                          .values("gender").annotate(count=Count("id")))
        by_contract= list(Employee.objects.filter(employment_status="active")
                          .values("contract_type").annotate(count=Count("id")))
        return Response({
            "total":       total,
            "by_dept":     by_dept,
            "by_gender":   by_gender,
            "by_contract": by_contract,
        })


class LeaveSummaryView(APIView):
    """GET /api/reports/leave/?year=2024"""
    permission_classes = [IsHROrAdmin]

    def get(self, request):
        year = request.query_params.get("year", date.today().year)
        qs   = LeaveRequest.objects.filter(start_date__year=year)
        by_status = list(qs.values("status").annotate(count=Count("id")))
        by_type   = list(qs.values("leave_type__name").annotate(count=Count("id")))
        return Response({"year": year, "by_status": by_status, "by_type": by_type, "total": qs.count()})


class RecruitmentSummaryView(APIView):
    """GET /api/reports/recruitment/"""
    permission_classes = [IsHROrAdmin]

    def get(self, request):
        jobs  = JobPosting.objects.all()
        apps  = JobApplication.objects.all()
        return Response({
            "total_jobs":          jobs.count(),
            "open_jobs":           jobs.filter(status="open").count(),
            "total_applications":  apps.count(),
            "shortlisted":         apps.filter(status="shortlisted").count(),
            "hired":               apps.filter(status="hired").count(),
            "rejected":            apps.filter(status="rejected").count(),
            "by_job_type":         list(jobs.values("job_type").annotate(count=Count("id"))),
        })


class PerformanceSummaryView(APIView):
    """GET /api/reports/performance/"""
    permission_classes = [IsHROrAdmin]

    def get(self, request):
        qs = PerformanceReview.objects.all()
        cycle_id = request.query_params.get("cycle_id")
        if cycle_id:
            qs = qs.filter(cycle_id=cycle_id)

        return Response({
            "total_reviews":    qs.count(),
            "avg_score":        qs.aggregate(avg=Avg("overall_score"))["avg"],
            "by_status":        list(qs.values("status").annotate(count=Count("id"))),
            "by_grade":         list(qs.values("grade").annotate(count=Count("id"))),
            "cycles":           list(PerformanceCycle.objects.values("id", "name", "year")),
        })


class TransferSummaryView(APIView):
    """GET /api/reports/transfers/"""
    permission_classes = [IsHROrAdmin]

    def get(self, request):
        qs = Transfer.objects.all()
        return Response({
            "total":            qs.count(),
            "by_type":          list(qs.values("transfer_type").annotate(count=Count("id"))),
            "by_status":        list(qs.values("status").annotate(count=Count("id"))),
            "pending":          qs.filter(status="pending").count(),
            "approved":         qs.filter(status="approved").count(),
            "completed":        qs.filter(status="completed").count(),
        })


class ManpowerSummaryView(APIView):
    """GET /api/reports/manpower/"""
    permission_classes = [IsHROrAdmin]

    def get(self, request):
        qs = ManpowerPlan.objects.all()
        return Response({
            "total_plans":      qs.count(),
            "by_status":        list(qs.values("status").annotate(count=Count("id"))),
            "total_budget":     qs.aggregate(total=Sum("budget"))["total"],
            "total_gap":        sum(p.gap for p in qs),
        })


class TraineeSummaryView(APIView):
    """GET /api/reports/trainees/"""
    permission_classes = [IsHROrAdmin]

    def get(self, request):
        trainees = Trainee.objects.all()
        programs = TrainingProgram.objects.all()
        return Response({
            "total_trainees":   trainees.count(),
            "active":           trainees.filter(status="active").count(),
            "completed":        trainees.filter(status="completed").count(),
            "by_type":          list(trainees.values("trainee_type").annotate(count=Count("id"))),
            "by_status":        list(trainees.values("status").annotate(count=Count("id"))),
            "total_programs":   programs.count(),
            "open_programs":    programs.filter(status="open").count(),
        })


# ── Reference data endpoints (for dynamic filter dropdowns) ──────────────────

class ReportReferenceDataView(APIView):
    """GET /api/reports/reference-data/ — returns departments, leave types, cycles, programs."""
    permission_classes = [IsHROrAdmin]

    def get(self, request):
        return Response({
            "departments": list(Department.objects.values("id", "name").order_by("name")),
            "leave_types": list(LeaveType.objects.values("id", "name")),
            "cycles":      list(PerformanceCycle.objects.values("id", "name", "year").order_by("-year")),
            "programs":    list(TrainingProgram.objects.values("id", "title", "program_type")),
        })