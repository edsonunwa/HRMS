from django.shortcuts import get_object_or_404
from django.apps import apps
from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import PerformanceCycle, KPI, PerformanceReview, JobEvaluation
from .serializers import PerformanceCycleSerializer, KPISerializer, PerformanceReviewSerializer, JobEvaluationSerializer
from apps.authentication.permissions import IsHROrAdmin, IsDepartmentHeadOrAbove
from apps.authentication.models import ROLES, User
from rest_framework.permissions import IsAuthenticated
from apps.authentication.audit import AuditLogMixin


class CycleListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    queryset           = PerformanceCycle.objects.all()
    serializer_class   = PerformanceCycleSerializer
    permission_classes = [IsHROrAdmin]


class CycleDetailView(AuditLogMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset           = PerformanceCycle.objects.all()
    serializer_class   = PerformanceCycleSerializer
    permission_classes = [IsHROrAdmin]


class KPIListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    serializer_class   = KPISerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["cycle","employee"]

    def get_queryset(self):
        user = self.request.user
        if user.role in ("hr_officer","hr_director","admin"):
            return KPI.objects.all()
        if user.role == "department_head":
            profile = user.get_employee_profile()
            if profile is None:
                return KPI.objects.none()
            return KPI.objects.filter(employee__department=profile.department)
        profile = user.get_employee_profile()
        if profile is None:
            return KPI.objects.none()
        return KPI.objects.filter(employee=profile)


class KPIDetailView(AuditLogMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset           = KPI.objects.all()
    serializer_class   = KPISerializer
    permission_classes = [IsAuthenticated]


class ReviewListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    serializer_class   = PerformanceReviewSerializer
    permission_classes = [IsDepartmentHeadOrAbove]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ["cycle","status"]
    search_fields      = ["employee__user__first_name","employee__employee_id"]

    def get_queryset(self):
        user = self.request.user
        if user.role in ("hr_officer","hr_director","admin"):
            return PerformanceReview.objects.all()
        if user.role == "department_head":
            profile = user.get_employee_profile()
            if profile is None:
                return PerformanceReview.objects.none()
            return PerformanceReview.objects.filter(employee__department=profile.department)
        profile = user.get_employee_profile()
        if profile is None:
            return PerformanceReview.objects.none()
        return PerformanceReview.objects.filter(employee=profile)


class ReviewDetailView(AuditLogMixin, generics.RetrieveUpdateAPIView):
    queryset           = PerformanceReview.objects.all()
    serializer_class   = PerformanceReviewSerializer
    permission_classes = [IsAuthenticated]


class ReviewSelfAssessView(AuditLogMixin, APIView):
    """
    Allows an employee to submit self-assessment for their own review.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        review = generics.get_object_or_404(PerformanceReview, pk=pk)
        user = request.user

        # Only own self-assessment
        profile = user.get_employee_profile()
        if profile is None or review.employee != profile:
            return Response({"detail": "Not allowed."}, status=403)

        self_score = request.data.get("self_score")
        self_comments = request.data.get("self_comments", "")
        if self_score is None:
            return Response({"self_score": "This field is required."}, status=400)

        review.self_score = self_score
        review.self_comments = self_comments
        review.status = "self_assessed"
        review.save()

        serializer = self.get_serializer(review)
        return Response(serializer.data, status=200)


class ReviewSubmitView(AuditLogMixin, APIView):
    """
    Allows department heads / HR / Admin to submit a review with
    appraiser_score and appraiser_comments.
    """
    permission_classes = [IsDepartmentHeadOrAbove]

    def post(self, request, pk):
        review = generics.get_object_or_404(PerformanceReview, pk=pk)
        user = request.user

        # Department head review scope check
        if user.role == "department_head":
            profile = user.get_employee_profile()
            if profile is None or review.employee.department != profile.department:
                return Response({"detail": "Not allowed."}, status=403)

        score = request.data.get("appraiser_score")
        comments = request.data.get("appraiser_comments", "")
        if score is None:
            return Response({"appraiser_score": "This field is required."}, status=400)

        review.appraiser_score = score
        review.appraiser_comments = comments
        # Auto-calculate grade based on score
        try:
            s = float(score)
        except (TypeError, ValueError):
            return Response({"appraiser_score": "Invalid score."}, status=400)

        if s >= 80:
            review.grade = "A"
        elif s >= 70:
            review.grade = "B"
        elif s >= 60:
            review.grade = "C"
        else:
            review.grade = "D"

        review.status = "reviewed"
        review.appraiser = user
        review.save()

        # Notify HR officers
        hr_users = User.objects.filter(role__in=(ROLES.HR_OFFICER, ROLES.HR_DIRECTOR, ROLES.ADMIN))
        Notification = apps.get_model("notifications", "Notification")
        for hr_user in hr_users:
            Notification.objects.create(
                recipient=hr_user,
                title="Performance Review Submitted",
                message=f"Review for {review.employee.full_name} ({review.cycle.name}) has been completed by {user.full_name}.",
                category="evaluation",
                link=f"/evaluation/reviews/{review.id}/",
            )

        serializer = self.get_serializer(review)
        return Response(serializer.data, status=200)


class ReviewApproveView(AuditLogMixin, APIView):
    """
    Allows HR Director / Admin to give final approval on a review.
    """
    permission_classes = [IsHROrAdmin]

    def post(self, request, pk):
        review = generics.get_object_or_404(PerformanceReview, pk=pk)
        action = request.data.get("action")  # "approve" or "reject"

        if action == "approve":
            review.status = "approved"
        elif action == "reject":
            review.status = "reviewed"  # send back to appraiser
        else:
            return Response({"action": "Must be 'approve' or 'reject'."}, status=400)

        review.save()

        # Notify the appraiser
        if review.appraiser:
            Notification = apps.get_model("notifications", "Notification")
            Notification.objects.create(
                recipient=review.appraiser,
                title=f"Review {action}d",
                message=f"Performance review for {review.employee.full_name} ({review.cycle.name}) has been {action}d by {request.user.full_name}.",
                category="evaluation",
                link=f"/evaluation/reviews/{review.id}/",
            )

        serializer = self.get_serializer(review)
        return Response(serializer.data, status=200)


class DepartmentEmployeesView(APIView):
    """
    Returns employees in the current user's department (for Department Head).
    HR/Admin see all employees.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        from apps.employees.models import Employee

        if user.role in ("hr_officer", "hr_director", "admin"):
            employees = Employee.objects.select_related("user", "department", "position").all()
        elif user.role == "department_head":
            profile = user.get_employee_profile()
            if profile is None:
                employees = Employee.objects.none()
            else:
                employees = Employee.objects.select_related("user", "department", "position").filter(department=profile.department)
        else:
            return Response([], status=200)

        data = [
            {
                "id": emp.id,
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "department": emp.department.name if emp.department else "",
                "position": emp.position.title if emp.position else "",
                "grade": emp.grade.level if emp.grade else "",
            }
            for emp in employees
        ]
        return Response(data)


class JobEvaluationListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    queryset           = JobEvaluation.objects.all()
    serializer_class   = JobEvaluationSerializer
    permission_classes = [IsHROrAdmin]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["status","position"]


class JobEvaluationDetailView(AuditLogMixin, generics.RetrieveUpdateAPIView):
    queryset           = JobEvaluation.objects.all()
    serializer_class   = JobEvaluationSerializer
    permission_classes = [IsHROrAdmin]