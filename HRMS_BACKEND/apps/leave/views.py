from django.db.models import F
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
from apps.authentication.models import ROLES
from apps.authentication.audit import AuditLogMixin, log_audit_event

# ---------------------------------------------------------------------------
# Approval chain
# ---------------------------------------------------------------------------
# Level 1 — Direct supervisor  (employee.supervisor.user)
# Level 2 — Department head    (employee.department.head)
# Level 3 — Senior management  (role == SENIOR_MANAGEMENT)
# Level 4 — HR Officer / HR Director  ← final, triggers status + balance
# ---------------------------------------------------------------------------

FINAL_LEVEL = 4


def _dept_senior_managers(department):
    """
    Return a queryset of User objects who are Senior Management AND have an
    employee profile in the given department.
    """
    from apps.employees.models import Employee
    emp_ids = Employee.objects.filter(
        department=department,
        user__role=ROLES.SENIOR_MANAGEMENT,
        user__is_active=True,
    ).values_list('user_id', flat=True)
    from django.contrib.auth import get_user_model
    return get_user_model().objects.filter(pk__in=emp_ids)


def _get_approver_level(approver, leave):
    """
    Return the level this approver is entitled to act on for this leave request,
    or None if they have no standing in the chain.
    """
    employee = leave.employee

    # Level 1 — direct supervisor
    supervisor_profile = employee.supervisor
    if supervisor_profile and supervisor_profile.user == approver:
        return 1

    # Level 2 — department head
    dept_head = employee.department.head
    if dept_head and dept_head == approver:
        return 2

    # Level 3 — senior management in the same department
    if approver.role == ROLES.SENIOR_MANAGEMENT:
        if _dept_senior_managers(employee.department).filter(pk=approver.pk).exists():
            return 3

    # Level 4 — HR (final)
    if approver.role in (ROLES.HR_OFFICER, ROLES.HR_DIRECTOR, ROLES.ADMIN):
        return 4

    return None


def _next_required_level(leave):
    """
    Return the next level that must act, skipping levels where no one is
    assigned (e.g. employee has no supervisor → skip level 1).
    """
    employee = leave.employee
    for level in range(leave.current_level, FINAL_LEVEL + 1):
        if level == 1 and employee.supervisor is None:
            continue
        if level == 2 and employee.department.head is None:
            continue
        if level == 3 and not _dept_senior_managers(employee.department).exists():
            continue
        return level
    return FINAL_LEVEL


# ---------------------------------------------------------------------------
# Views
# ---------------------------------------------------------------------------

class LeaveTypeListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    queryset           = LeaveType.objects.all()
    serializer_class   = LeaveTypeSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method != 'GET':
            return [IsHROrAdmin()]
        return [IsAuthenticated()]


class LeaveTypeDetailView(AuditLogMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset           = LeaveType.objects.all()
    serializer_class   = LeaveTypeSerializer
    permission_classes = [IsHROrAdmin]


class LeaveBalanceListView(generics.ListAPIView):
    serializer_class   = LeaveBalanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in (ROLES.HR_OFFICER, ROLES.HR_DIRECTOR, ROLES.ADMIN):
            emp_id = self.request.query_params.get('employee')
            if emp_id:
                return LeaveBalance.objects.filter(employee_id=emp_id)
            return LeaveBalance.objects.all()
        return LeaveBalance.objects.filter(employee=user.get_employee_profile())


class LeaveRequestListCreateView(AuditLogMixin, generics.ListCreateAPIView):
    serializer_class   = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['status', 'leave_type']

    def get_queryset(self):
        user = self.request.user
        if user.role in (ROLES.HR_OFFICER, ROLES.HR_DIRECTOR, ROLES.ADMIN):
            return LeaveRequest.objects.select_related('employee', 'leave_type').all()
        if user.role == ROLES.DEPARTMENT_HEAD:
            profile = user.get_employee_profile()
            if profile is None:
                return LeaveRequest.objects.none()
            dept = profile.department
            return LeaveRequest.objects.filter(employee__department=dept)
        if user.role == ROLES.SENIOR_MANAGEMENT:
            profile = user.get_employee_profile()
            if profile is None:
                return LeaveRequest.objects.none()
            return LeaveRequest.objects.filter(employee__department=profile.department)
        profile = user.get_employee_profile()
        if profile is None:
            return LeaveRequest.objects.none()
        # Employees also see requests where they are the supervisor
        own = LeaveRequest.objects.filter(employee=profile)
        subordinate = LeaveRequest.objects.filter(employee__supervisor=profile)
        return (own | subordinate).distinct()


class LeaveRequestDetailView(AuditLogMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = LeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in (ROLES.HR_OFFICER, ROLES.HR_DIRECTOR, ROLES.ADMIN,
                         ROLES.DEPARTMENT_HEAD, ROLES.SENIOR_MANAGEMENT):
            return LeaveRequest.objects.all()
        profile = user.get_employee_profile()
        if profile is None:
            return LeaveRequest.objects.none()
        own = LeaveRequest.objects.filter(employee=profile)
        subordinate = LeaveRequest.objects.filter(employee__supervisor=profile)
        return (own | subordinate).distinct()


class ApproveLeaveView(APIView):
    """
    POST /api/leave/requests/<pk>/approve/

    Enforces the approval hierarchy:
      Level 1 — direct supervisor
      Level 2 — department head
      Level 3 — senior management
      Level 4 — HR Officer / HR Director (final)

    Each level must act in order. On rejection at any level the request is
    immediately rejected. On final HR approval the balance is deducted.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            leave = LeaveRequest.objects.select_related(
                'employee__supervisor__user',
                'employee__department__head',
                'employee__user',
                'leave_type',
            ).get(pk=pk)
        except LeaveRequest.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Only pending requests can be acted on
        if leave.status != 'pending':
            return Response(
                {'detail': f'This request is already {leave.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        decision = request.data.get('decision')
        if decision not in ('approved', 'rejected'):
            return Response(
                {'detail': 'decision must be "approved" or "rejected".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Self-approval guard
        if leave.employee.user == request.user:
            return Response(
                {'detail': 'You cannot approve your own leave request.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Determine what level this approver maps to
        approver_level = _get_approver_level(request.user, leave)
        if approver_level is None:
            return Response(
                {'detail': 'You are not in the approval chain for this request.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Determine the next required level (skipping unassigned levels)
        required_level = _next_required_level(leave)

        if approver_level != required_level:
            # Higher-level approvers may override pending lower levels
            if approver_level > required_level:
                if not request.data.get('override'):
                    return Response(
                        {
                            'detail': (
                                f'This request is awaiting a level-{required_level} approval. '
                                f'You are level {approver_level}. '
                                f'Set override=true to bypass the pending level.'
                            ),
                            'requires_override': True,
                            'required_level': required_level,
                            'approver_level': approver_level,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                # Override: act at the required level, not the approver's level
                acting_level = required_level
            else:
                # Lower-level approver trying to act out of turn
                return Response(
                    {'detail': (
                        f'This request is awaiting a level-{required_level} approval. '
                        f'Your role maps to level {approver_level}.'
                    )},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            acting_level = approver_level

        # Record the approval
        LeaveApproval.objects.create(
            leave_request=leave,
            approver=request.user,
            decision=decision,
            comment=request.data.get('comment', ''),
            level=acting_level,
        )

        # Rejection at any level immediately closes the request
        if decision == 'rejected':
            leave.status = 'rejected'
            leave.save(update_fields=['status', 'updated_at'])
            log_audit_event(
                action='UPDATE',
                resource='LeaveRequest',
                request=request,
                user=request.user,
                instance=leave,
                detail=f'Leave request #{leave.pk} rejected at level {acting_level}',
                metadata={'decision': decision, 'acting_level': acting_level},
            )
            return Response({'detail': 'Leave request rejected.'})

        # Approval — check if this is the final level
        if acting_level == FINAL_LEVEL:
            bal, _ = LeaveBalance.objects.get_or_create(
                employee=leave.employee,
                leave_type=leave.leave_type,
                year=leave.start_date.year,
                defaults={'total_days': leave.leave_type.days_allowed}
            )
            bal.refresh_from_db()
            if leave.days_requested > bal.remaining_days:
                return Response(
                    {'detail': (
                        f'Cannot approve: employee only has {bal.remaining_days} day(s) '
                        f'remaining for {leave.leave_type.name}.'
                    )},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            LeaveBalance.objects.filter(pk=bal.pk).update(
                used_days=F('used_days') + leave.days_requested
            )
            leave.status = 'approved'
            leave.save(update_fields=['status', 'updated_at'])
            log_audit_event(
                action='UPDATE',
                resource='LeaveRequest',
                request=request,
                user=request.user,
                instance=leave,
                detail=f'Leave request #{leave.pk} approved at final level',
                metadata={'decision': decision, 'acting_level': acting_level},
            )
            return Response({'detail': 'Leave request approved.'})

        # Not the final level — advance to the next required level
        leave.current_level = acting_level + 1
        # Recalculate next required level after advancing
        next_level = _next_required_level(leave)
        leave.current_level = next_level
        leave.save(update_fields=['current_level', 'updated_at'])
        log_audit_event(
            action='UPDATE',
            resource='LeaveRequest',
            request=request,
            user=request.user,
            instance=leave,
            detail=f'Leave request #{leave.pk} approved at level {acting_level}',
            metadata={'decision': decision, 'acting_level': acting_level, 'next_level': next_level},
        )
        return Response({'detail': f'Level-{acting_level} approval recorded. Awaiting level-{next_level} approval.'})


class CancelLeaveView(APIView):
    """
    POST /api/leave/requests/<pk>/cancel/

    - Employee (owner): can recall an approved request only if leave hasn't started yet.
    - HR/Admin: can cancel any pending request, or recall any approved request.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            leave = LeaveRequest.objects.get(pk=pk)
        except LeaveRequest.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_owner = leave.employee.user == request.user
        is_hr    = request.user.role in (ROLES.HR_OFFICER, ROLES.HR_DIRECTOR, ROLES.ADMIN)

        if not (is_owner or is_hr):
            return Response(
                {'detail': 'You do not have permission to perform this action.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        from django.utils import timezone
        today = timezone.now().date()

        if leave.status == 'pending':
            if not (is_owner or is_hr):
                return Response(
                    {'detail': 'You do not have permission to cancel this request.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            leave.status = 'cancelled'
            leave.save(update_fields=['status', 'updated_at'])
            log_audit_event(
                action='UPDATE',
                resource='LeaveRequest',
                request=request,
                user=request.user,
                instance=leave,
                detail=f'Leave request #{leave.pk} cancelled',
            )
            return Response({'detail': 'Leave request cancelled.'})

        if leave.status == 'approved':
            if not is_hr and leave.start_date <= today:
                return Response(
                    {'detail': 'Leave has already started and cannot be recalled. Contact HR.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            LeaveBalance.objects.filter(
                employee=leave.employee,
                leave_type=leave.leave_type,
                year=leave.start_date.year,
            ).update(used_days=F('used_days') - leave.days_requested)
            leave.status = 'recalled'
            leave.save(update_fields=['status', 'updated_at'])
            log_audit_event(
                action='UPDATE',
                resource='LeaveRequest',
                request=request,
                user=request.user,
                instance=leave,
                detail=f'Leave request #{leave.pk} recalled',
            )
            return Response({'detail': 'Leave request recalled and balance restored.'})

        return Response(
            {'detail': f'A {leave.status} request cannot be modified.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
