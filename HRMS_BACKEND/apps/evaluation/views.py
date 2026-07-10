from rest_framework import generics, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import PerformanceCycle, KPI, PerformanceReview, JobEvaluation
from .serializers import PerformanceCycleSerializer, KPISerializer, PerformanceReviewSerializer, JobEvaluationSerializer
from apps.authentication.permissions import IsHROrAdmin, IsDepartmentHeadOrAbove
from rest_framework.permissions import IsAuthenticated


class CycleListCreateView(generics.ListCreateAPIView):
    queryset           = PerformanceCycle.objects.all()
    serializer_class   = PerformanceCycleSerializer
    permission_classes = [IsHROrAdmin]


class CycleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = PerformanceCycle.objects.all()
    serializer_class   = PerformanceCycleSerializer
    permission_classes = [IsHROrAdmin]


class KPIListCreateView(generics.ListCreateAPIView):
    serializer_class   = KPISerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["cycle","employee"]

    def get_queryset(self):
        user = self.request.user
        if user.role in ("hr_officer","hr_director","admin","department_head"):
            return KPI.objects.all()
        return KPI.objects.filter(employee=user.employee_profile)


class KPIDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = KPI.objects.all()
    serializer_class   = KPISerializer
    permission_classes = [IsAuthenticated]


class ReviewListCreateView(generics.ListCreateAPIView):
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
            return PerformanceReview.objects.filter(employee__department=user.employee_profile.department)
        return PerformanceReview.objects.filter(employee=user.employee_profile)


class ReviewDetailView(generics.RetrieveUpdateAPIView):
    queryset           = PerformanceReview.objects.all()
    serializer_class   = PerformanceReviewSerializer
    permission_classes = [IsAuthenticated]


class JobEvaluationListCreateView(generics.ListCreateAPIView):
    queryset           = JobEvaluation.objects.all()
    serializer_class   = JobEvaluationSerializer
    permission_classes = [IsHROrAdmin]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ["status","position"]


class JobEvaluationDetailView(generics.RetrieveUpdateAPIView):
    queryset           = JobEvaluation.objects.all()
    serializer_class   = JobEvaluationSerializer
    permission_classes = [IsHROrAdmin]