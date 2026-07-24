from rest_framework import generics, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from .models import Department, Grade, Position, Employee
from .serializers import (BranchSerializer,
    DepartmentSerializer, GradeSerializer, PositionSerializer,
    EmployeeListSerializer, EmployeeDetailSerializer, EmployeeCreateSerializer,
)
from apps.authentication.permissions import IsHROrAdmin, IsDepartmentHeadOrAbove
from apps.authentication.audit import AuditLogMixin

from apps.authentication.permissions import (IsHROrAdmin,IsDepartmentHeadOrAbove,CanViewOrganisationData)
from .models import Branch


class BranchListCreateView(generics.ListCreateAPIView):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]


class DepartmentListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    queryset           = Department.objects.all()
    serializer_class   = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['name', 'code', 'region']


class DepartmentDetailView(AuditLogMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset           = Department.objects.all()
    serializer_class   = DepartmentSerializer
    permission_classes = [IsHROrAdmin]


class GradeListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    queryset           = Grade.objects.all()
    serializer_class   = GradeSerializer
    permission_classes = [IsHROrAdmin]


class GradeDetailView(AuditLogMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset           = Grade.objects.all()
    serializer_class   = GradeSerializer
    permission_classes = [IsHROrAdmin]


class PositionListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    queryset           = Position.objects.all()
    serializer_class   = PositionSerializer
    permission_classes = [CanViewOrganisationData]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['department', 'is_active']
    search_fields      = ['title']


class PositionDetailView(AuditLogMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset           = Position.objects.all()
    serializer_class   = PositionSerializer
    permission_classes = [IsHROrAdmin]


class EmployeeListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    queryset           = Employee.objects.select_related('user', 'department', 'position').all()
    permission_classes = [IsDepartmentHeadOrAbove]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['department', 'employment_status', 'contract_type', 'gender']
    search_fields      = ['employee_id', 'user__first_name', 'user__last_name', 'user__email']
    ordering_fields    = ['employee_id', 'join_date', 'user__last_name']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EmployeeCreateSerializer
        return EmployeeListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Employee.objects.select_related('user', 'department', 'position').all()
        if user.role == "department_head":
            profile = user.get_employee_profile()
            if profile is not None and profile.department is not None:
                qs = qs.filter(department=profile.department)
        return qs


class EmployeeDetailView(AuditLogMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset           = Employee.objects.select_related('user', 'department', 'position', 'grade').all()
    serializer_class   = EmployeeDetailSerializer
    permission_classes = [IsDepartmentHeadOrAbove]


class MyProfileView(AuditLogMixin, generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/employees/me/ — any logged-in employee."""
    queryset           = Employee.objects.select_related('user', 'department', 'position', 'grade', 'supervisor').all()
    serializer_class   = EmployeeDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile = self.request.user.get_employee_profile()
        if profile is None:
            from rest_framework.exceptions import NotFound
            raise NotFound('No employee profile linked to this account.')
        return profile