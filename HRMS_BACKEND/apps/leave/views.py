from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import LeaveType, LeaveBalance, LeaveRequest, LeaveApproval
from .serializers import (
    LeaveTypeSerializer, LeaveBalanceSerializer,
    LeaveRequestSerializer, LeaveApprovalSerializer,
)
from apps.authentication.permissions import IsHROrAdmin, IsDepartmentHeadOrAbove


class LeaveTypeListCreateView(generics.ListCreateAPIView):
    queryset           = LeaveType.objects.all()
    serializer_class   = LeaveTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method != 'GET':
            return [IsHROrAdmin()]
        return [IsAuthenticated()]


class LeaveTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = LeaveType.objects.all()
    serializer_class   = LeaveTypeSerializer
    permission_classes = [IsHROrAdmin]


class LeaveBalanceListView(generics.ListAPIView):
    serializer_class   = LeaveBalanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('hr_officer', 'admin'):
            emp_id = self.request.query_params.get('employee')
            if emp_id:
                return LeaveBalance.objects.filter(employee_id=emp_id)
            return LeaveBalance.objects.all()
        return LeaveBalance.objects.filter(employee=user.employee_profile)


class LeaveRequestListCreateView(generics.ListCreateAPIView):
    serializer_class   = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['status', 'leave_type']

    def get_queryset(self):
        user = self.request.user
        if user.role in ('hr_officer', 'admin'):
            return LeaveRequest.objects.select_related('employee', 'leave_type').all()
        if user.role == 'department_head':
            dept = user.employee_profile.department
            return LeaveRequest.objects.filter(employee__department=dept)
        return LeaveRequest.objects.filter(employee=user.employee_profile)


class LeaveRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('hr_officer', 'admin', 'department_head'):
            return LeaveRequest.objects.all()
        return LeaveRequest.objects.filter(employee=user.employee_profile)


class ApproveLeaveView(APIView):
    """POST /api/leave/requests/<pk>/approve/"""
    permission_classes = [IsDepartmentHeadOrAbove]

    def post(self, request, pk):
        try:
            leave = LeaveRequest.objects.get(pk=pk)
        except LeaveRequest.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        decision = request.data.get('decision')
        if decision not in ('approved', 'rejected'):
            return Response({'detail': 'decision must be approved or rejected.'}, status=400)

        LeaveApproval.objects.create(
            leave_request=leave,
            approver=request.user,
            decision=decision,
            comment=request.data.get('comment', ''),
            level=request.data.get('level', 1),
        )

        # Final HR approval sets the leave request status
        if request.user.role in ('hr_officer', 'admin'):
            leave.status = decision
            leave.save()
            if decision == 'approved':
                bal, _ = LeaveBalance.objects.get_or_create(
                    employee=leave.employee,
                    leave_type=leave.leave_type,
                    year=leave.start_date.year,
                    defaults={'total_days': leave.leave_type.days_allowed}
                )
                bal.used_days += leave.days_requested
                bal.save()

        return Response({'detail': f'Leave {decision} successfully.'})