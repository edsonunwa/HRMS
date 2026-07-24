from django.shortcuts import get_object_or_404
from django.apps import apps
from django.utils import timezone
from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import PerformanceCycle, KPI, PerformanceReview, JobEvaluation
from .serializers import PerformanceCycleSerializer, KPISerializer, PerformanceReviewSerializer, JobEvaluationSerializer, ManagerRatingSerializer, SelfRatingSerializer
from apps.authentication.permissions import IsHROrAdmin, IsDepartmentHeadOrAbove
from apps.authentication.models import ROLES, User
from rest_framework.permissions import IsAuthenticated
from apps.authentication.audit import AuditLogMixin
from decimal import Decimal


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


class ReviewKPIsView(APIView):
    """
    Returns KPIs for the employee and cycle of a given review.
    Department heads can only view KPIs for employees in their own department.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        review = generics.get_object_or_404(PerformanceReview, pk=pk)
        user = request.user

        # Scope check for department heads
        if user.role == "department_head":
            profile = user.get_employee_profile()
            if profile is None or review.employee.department != profile.department:
                return Response({"detail": "Not allowed."}, status=403)
        elif user.role == "employee":
            profile = user.get_employee_profile()
            if profile is None or review.employee != profile:
                return Response({"detail": "Not allowed."}, status=403)

        kpis = KPI.objects.filter(employee=review.employee, cycle=review.cycle)
        serializer = KPISerializer(kpis, many=True)
        return Response(serializer.data)


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

        serializer = PerformanceReviewSerializer(review)
        return Response(serializer.data, status=200)


class ReviewConfirmView(AuditLogMixin, APIView):
    """
    Allows department heads to confirm (approve) a self-assessment and send it to HR,
    or send it back to the employee for revision.
    """
    permission_classes = [IsDepartmentHeadOrAbove]

    def post(self, request, pk):
        review = generics.get_object_or_404(PerformanceReview, pk=pk)
        user = request.user

        # Only department heads can confirm/reject self-assessments
        if user.role != "department_head":
            return Response({"detail": "Only department heads can perform this action."}, status=403)

        # Department head review scope check
        profile = user.get_employee_profile()
        if profile is None or review.employee.department != profile.department:
            return Response({"detail": "Not allowed."}, status=403)

        action = request.data.get("action")  # "confirm" or "reject"
        if action not in ("confirm", "reject"):
            return Response({"action": "Must be 'confirm' or 'reject'."}, status=400)

        # Only allow confirmation of self-assessed reviews
        if review.status != "self_assessed":
            return Response({"detail": f"Cannot confirm review with status '{review.status}'. Review must be self-assessed."}, status=400)

        # Capture department head comments (required when rejecting, optional when confirming)
        hod_comments = request.data.get("hod_comments", "")
        review.hod_comments = hod_comments
        review.hod_reviewed_at = timezone.now()

        if action == "confirm":
            review.status = "pending_hr_review"
            review.appraiser = user  # Set the department head as the appraiser
        else:  # reject
            review.status = "pending"

        review.save()

        # Notify the employee
        Notification = apps.get_model("notifications", "Notification")
        if action == "confirm":
            message = f"Your self assessment for {review.cycle.name} has been confirmed and sent to HR by {user.full_name}."
        else:
            message = f"Your self assessment for {review.cycle.name} has been sent back for revision by {user.full_name}."
            if hod_comments:
                message += f" Feedback: {hod_comments}"
        Notification.objects.create(
            recipient=review.employee.user,
            title="Self Assessment Reviewed",
            message=message,
            category="evaluation",
            link=f"/evaluation/reviews/{review.id}/",
        )

        serializer = PerformanceReviewSerializer(review)
        return Response(serializer.data, status=200)


class ReviewSubmitView(AuditLogMixin, APIView):
    """
    Allows HR / Admin to submit the final appraisal with
    appraiser_score, appraiser_comments, and per-KPI appraiser scores.
    """
    permission_classes = [IsHROrAdmin]

    def post(self, request, pk):
        review = generics.get_object_or_404(PerformanceReview, pk=pk)
        user = request.user

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
        review.save()

        # Update per-KPI appraiser scores if provided
        kpi_scores = request.data.get("kpi_scores")
        if kpi_scores and isinstance(kpi_scores, list):
            for kpi_data in kpi_scores:
                kpi_id = kpi_data.get("id")
                kpi_appraiser_score = kpi_data.get("appraiser_score")
                kpi_comments = kpi_data.get("comments", "")
                if kpi_id and kpi_appraiser_score is not None:
                    try:
                        kpi = KPI.objects.get(id=kpi_id, employee=review.employee, cycle=review.cycle)
                        kpi.appraiser_score = Decimal(str(kpi_appraiser_score))
                        kpi.comments = kpi_comments
                        kpi.save()
                    except KPI.DoesNotExist:
                        pass

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


class ManagerRatingListCreateView(AuditLogMixin, APIView):
    """
    List/Create manager ratings for employees in the department head's department.
    Department heads can view and rate employees in their own department.
    """
    permission_classes = [IsDepartmentHeadOrAbove]

    def get(self, request):
        """List department employees with their manager ratings (if any)."""
        user = request.user
        from apps.employees.models import Employee
        from .models import PerformanceReview

        # Get employees scoped to the user
        if user.role in ("hr_officer", "hr_director", "admin"):
            employees = Employee.objects.select_related("user", "department", "position").all()
        elif user.role == "department_head":
            profile = user.get_employee_profile()
            if profile is None:
                return Response([])
            employees = Employee.objects.select_related("user", "department", "position").filter(
                department=profile.department
            )
        else:
            return Response([], status=200)

        # Get the latest active cycle for context
        active_cycle = PerformanceCycle.objects.filter(is_active=True).first()

        data = []
        for emp in employees:
            # Try to find an existing performance review for this employee in the active cycle
            review = None
            if active_cycle:
                review = PerformanceReview.objects.filter(
                    employee=emp, cycle=active_cycle
                ).first()

            position_title = emp.position.title if emp.position else "—"

            if review:
                data.append({
                    "id": review.id,
                    "employee_id": emp.id,
                    "employee_name": emp.full_name,
                    "position": position_title,
                    "cycle_name": active_cycle.name if active_cycle else "",
                    "communication_score": review.communication_score,
                    "productivity_score": review.productivity_score,
                    "innovation_score": review.innovation_score,
                    "manager_comment": review.manager_comment,
                })
            else:
                # Still show the employee, with no ratings yet
                data.append({
                    "id": None,
                    "employee_id": emp.id,
                    "employee_name": emp.full_name,
                    "position": position_title,
                    "cycle_name": active_cycle.name if active_cycle else "No active cycle",
                    "communication_score": None,
                    "productivity_score": None,
                    "innovation_score": None,
                    "manager_comment": "",
                })

        return Response(data)

    def post(self, request):
        """Submit or update manager ratings for an employee."""
        user = request.user
        employee_id = request.data.get("employee_id")
        if not employee_id:
            return Response({"employee_id": "This field is required."}, status=400)

        from apps.employees.models import Employee
        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response({"detail": "Employee not found."}, status=404)

        # Scope check for department heads
        if user.role == "department_head":
            profile = user.get_employee_profile()
            if profile is None or employee.department != profile.department:
                return Response({"detail": "Not allowed."}, status=403)

        # Find or create a performance review for this employee in the active cycle
        active_cycle = PerformanceCycle.objects.filter(is_active=True).first()
        if not active_cycle:
            return Response({"detail": "No active performance cycle found."}, status=400)

        review, created = PerformanceReview.objects.get_or_create(
            employee=employee,
            cycle=active_cycle,
            defaults={"status": "pending"}
        )

        # Update the rating fields
        communication_score = request.data.get("communication_score")
        productivity_score = request.data.get("productivity_score")
        innovation_score = request.data.get("innovation_score")
        manager_comment = request.data.get("manager_comment", "")

        if communication_score is not None:
            review.communication_score = communication_score
        if productivity_score is not None:
            review.productivity_score = productivity_score
        if innovation_score is not None:
            review.innovation_score = innovation_score
        review.manager_comment = manager_comment
        review.save()

        return Response({
            "id": review.id,
            "employee_id": employee.id,
            "employee_name": employee.full_name,
            "cycle_name": active_cycle.name,
            "communication_score": review.communication_score,
            "productivity_score": review.productivity_score,
            "innovation_score": review.innovation_score,
            "manager_comment": review.manager_comment,
        }, status=200)


class SelfRatingView(AuditLogMixin, APIView):
    """
    Allows employees to view and submit their self-ratings.
    Only the employee themselves can access their own self-rating.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get the current employee's self-rating for the active cycle."""
        user = request.user
        profile = user.get_employee_profile()
        if profile is None:
            return Response({"detail": "No employee profile found."}, status=404)

        active_cycle = PerformanceCycle.objects.filter(is_active=True).first()
        if not active_cycle:
            return Response({"detail": "No active performance cycle."}, status=404)

        review, created = PerformanceReview.objects.get_or_create(
            employee=profile,
            cycle=active_cycle,
            defaults={"status": "pending"}
        )

        serializer = SelfRatingSerializer(review)
        return Response(serializer.data)

    def post(self, request):
        """Submit or update the current employee's self-rating."""
        user = request.user
        profile = user.get_employee_profile()
        if profile is None:
            return Response({"detail": "No employee profile found."}, status=404)

        active_cycle = PerformanceCycle.objects.filter(is_active=True).first()
        if not active_cycle:
            return Response({"detail": "No active performance cycle."}, status=400)

        review, created = PerformanceReview.objects.get_or_create(
            employee=profile,
            cycle=active_cycle,
            defaults={"status": "pending"}
        )

        self_communication = request.data.get("self_communication_score")
        self_productivity = request.data.get("self_productivity_score")
        self_innovation = request.data.get("self_innovation_score")
        self_comment = request.data.get("self_comment", "")

        if self_communication is not None:
            review.self_communication_score = self_communication
        if self_productivity is not None:
            review.self_productivity_score = self_productivity
        if self_innovation is not None:
            review.self_innovation_score = self_innovation
        review.self_comment = self_comment

        # Mark as self_assessed if all three scores are provided
        if (self_communication and self_productivity and self_innovation and
                review.status == "pending"):
            review.status = "self_assessed"

        review.save()

        # Notify department head(s) about the new self-assessment
        if review.status == "self_assessed":
            dept = review.employee.department
            if dept and dept.head:
                Notification = apps.get_model("notifications", "Notification")
                Notification.objects.create(
                    recipient=dept.head,
                    title="Self Assessment Submitted",
                    message=f"{review.employee.full_name} has submitted their self assessment for {review.cycle.name}.",
                    category="evaluation",
                    link=f"/evaluation/reviews/{review.id}/",
                )

        serializer = SelfRatingSerializer(review)
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
