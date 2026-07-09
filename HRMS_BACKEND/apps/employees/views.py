from rest_framework import generics, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from .models import Department, Grade, Position, Employee
from .serializers import (
    DepartmentSerializer, GradeSerializer, PositionSerializer,
    EmployeeListSerializer, EmployeeDetailSerializer,
)
from apps.authentication.permissions import IsHROrAdmin, IsDepartmentHeadOrAbove


class DepartmentListCreateView(generics.ListCreateAPIView):
    queryset           = Department.objects.all()
    serializer_class   = DepartmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['name', 'code', 'region']


class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Department.objects.all()
    serializer_class   = DepartmentSerializer
    permission_classes = [IsHROrAdmin]


class GradeListCreateView(generics.ListCreateAPIView):
    queryset           = Grade.objects.all()
    serializer_class   = GradeSerializer
    permission_classes = [IsHROrAdmin]


class GradeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Grade.objects.all()
    serializer_class   = GradeSerializer
    permission_classes = [IsHROrAdmin]


class PositionListCreateView(generics.ListCreateAPIView):
    queryset           = Position.objects.all()
    serializer_class   = PositionSerializer
    permission_classes = [IsHROrAdmin]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['department', 'is_active']
    search_fields      = ['title']


class PositionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Position.objects.all()
    serializer_class   = PositionSerializer
    permission_classes = [IsHROrAdmin]


class EmployeeListCreateView(generics.ListCreateAPIView):
    queryset           = Employee.objects.select_related('user', 'department', 'position').all()
    permission_classes = [IsDepartmentHeadOrAbove]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['department', 'employment_status', 'contract_type', 'gender']
    search_fields      = ['employee_id', 'user__first_name', 'user__last_name', 'user__email']
    ordering_fields    = ['employee_id', 'join_date', 'user__last_name']

    def get_serializer_class(self):
        return EmployeeDetailSerializer if self.request.method == 'POST' else EmployeeListSerializer


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Employee.objects.select_related('user', 'department', 'position', 'grade').all()
    serializer_class   = EmployeeDetailSerializer
    permission_classes = [IsDepartmentHeadOrAbove]


class MyProfileView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/employees/me/ — any logged-in employee."""
    serializer_class   = EmployeeDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        profile = self.request.user.get_employee_profile()
        if profile is None:
            from rest_framework.exceptions import NotFound
            raise NotFound('No employee profile linked to this account.')
        return profile