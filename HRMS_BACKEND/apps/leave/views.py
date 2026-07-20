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
from apps.authentication.models import ROLES, User
from apps.authentication.audit import AuditLogMixin, log_audit_event
from apps.notifications.models import Notification

# ---------------------------------------------------------------------------
# Approval chain
# ---------------------------------------------------------------------------
# Level 1 — Direct supervisor  (employee.supervisor.user)
# Level 2 — Department head    (employee.department.head)
# Level 3 — Senior management  (role == SENIOR_MANAGEMENT)
# Level 4 — HR Officer / HR Director  ← final, triggers status + balance
# ---------------------------------------------------------------------------

FINAL_LEVEL = 4


def _create_notification(recipient, title, message, notif_type='info', category='leave', link=''):
    """Helper function to create notifications."""
    try:
        # Validate recipient is a User instance
        if not recipient or not isinstance(recipient, User):
            print(f"Invalid recipient for notification: {recipient}")
            return
        
        Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notif_type=notif_type,
            category=category,
            link=link
        )
        print(f"Notification created successfully for {recipient.username}: {title}")
    except Exception as e:
        # Log error but don't break the main flow
        print(f"Failed to create notification: {e}")
        import traceback
        traceback.print_exc()


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
    
    Note: Department Heads and Senior Managers CANNOT approve their own requests.
    Their requests automatically skip their level and go to the level above.
    """
    employee = leave.employee

    # Prevent Department Heads, Senior Managers, and HR Officers from approving their own requests
    if employee.user == approver and employee.user.role in (ROLES.DEPARTMENT_HEAD, ROLES.SENIOR_MANAGEMENT, ROLES.HR_OFFICER):
        return None

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

    def perform_create(self, serializer):
        """Prevent employees from creating leave requests if they have a pending one."""
        user = self.request.user
        # Only enforce this for regular employees, not HR/Admin/Management
        if user.role not in (ROLES.HR_OFFICER, ROLES.HR_DIRECTOR, ROLES.ADMIN,
                             ROLES.DEPARTMENT_HEAD, ROLES.SENIOR_MANAGEMENT, ROLES.BOARD):
            profile = user.get_employee_profile()
            if profile:
                has_pending = LeaveRequest.objects.filter(
                    employee=profile,
                    status='pending'
                ).exists()
                if has_pending:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError(
                        'You already have a pending leave request. Please wait for it to be processed before submitting a new one.'
                    )
        
        # Save the instance first
        instance = serializer.save()
        
        # Department Heads and Senior Managers cannot approve their own requests,
        # so their requests should start at the level above them.
        # HR Officers bypass the normal chain entirely and go straight to HR peer/director.
        profile = user.get_employee_profile()
        if profile and instance.employee_id == profile.id:
            if user.role == ROLES.DEPARTMENT_HEAD:
                # Department Head's request skips Level 2 and starts at Level 3
                instance.current_level = 3
                instance.save(update_fields=['current_level'])
            elif user.role == ROLES.SENIOR_MANAGEMENT:
                # Senior Manager's request skips Level 3 and starts at Level 4 (HR)
                instance.current_level = 4
                instance.save(update_fields=['current_level'])
            elif user.role == ROLES.HR_OFFICER:
                # HR Officer — skip normal chain (Levels 1-3), go straight to HR peer/director
                instance.current_level = 4
                instance.save(update_fields=['current_level'])
            elif user.role == ROLES.HR_DIRECTOR:
                # HR Director — auto-approved immediately (just log it)
                instance.status = 'approved'
                instance.current_level = FINAL_LEVEL
                instance.save(update_fields=['status', 'current_level', 'updated_at'])
                
                # Deduct leave balance
                bal, _ = LeaveBalance.objects.get_or_create(
                    employee=instance.employee,
                    leave_type=instance.leave_type,
                    year=instance.start_date.year,
                    defaults={'total_days': instance.leave_type.days_allowed}
                )
                bal.refresh_from_db()
                if instance.days_requested <= bal.remaining_days:
                    LeaveBalance.objects.filter(pk=bal.pk).update(
                        used_days=F('used_days') + instance.days_requested
                    )
                
                # Notify the HR Director that leave was logged
                _create_notification(
                    recipient=user,
                    title='Leave Logged Successfully',
                    message=f'Your {instance.leave_type.name} leave from {instance.start_date} to {instance.end_date} has been logged and approved.',
                    notif_type='success',
                    category='leave',
                    link=f'/leave/{instance.id}'
                )
                
                log_audit_event(
                    action='CREATE',
                    resource='LeaveRequest',
                    request=self.request,
                    user=user,
                    instance=instance,
                    detail=f'HR Director {user.username} self-approved leave (auto)',
                    metadata={'status': 'approved', 'auto_approved': True},
                )
                
                # Return early — no need to send notifications to approvers
                return
        
        # Send notification to the first approver in the chain
        next_level = _next_required_level(instance)
        if next_level == 1 and instance.employee.supervisor:
            _create_notification(
                recipient=instance.employee.supervisor.user,
                title='New Leave Request',
                message=f'{instance.employee.full_name} has requested {instance.leave_type.name} leave from {instance.start_date} to {instance.end_date}.',
                notif_type='info',
                category='leave',
                link=f'/leave/{instance.id}'
            )
        elif next_level == 2 and instance.employee.department.head:
            _create_notification(
                recipient=instance.employee.department.head,
                title='New Leave Request',
                message=f'{instance.employee.full_name} has requested {instance.leave_type.name} leave from {instance.start_date} to {instance.end_date}.',
                notif_type='info',
                category='leave',
                link=f'/leave/{instance.id}'
            )
        elif next_level == 4:
            # Notify all HR Officers and HR Directors (Level 4 approvers)
            from apps.authentication.models import ROLES as ROLES_MODEL
            hr_users = User.objects.filter(
                role__in=[ROLES_MODEL.HR_OFFICER, ROLES_MODEL.HR_DIRECTOR],
                is_active=True,
            ).exclude(pk=user.pk if user else None)
            for hr_user in hr_users:
                _create_notification(
                    recipient=hr_user,
                    title='New Leave Request Pending HR Approval',
                    message=f'{instance.employee.full_name} has requested {instance.leave_type.name} leave from {instance.start_date} to {instance.end_date}.',
                    notif_type='info',
                    category='leave',
                    link=f'/leave/{instance.id}'
                )


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

        # Determine what level this approver maps to
        approver_level = _get_approver_level(request.user, leave)
        if approver_level is None:
            # Check if this is a self-approval attempt
            if leave.employee.user == request.user and request.user.role in (ROLES.DEPARTMENT_HEAD, ROLES.SENIOR_MANAGEMENT, ROLES.HR_OFFICER):
                return Response(
                    {'detail': 'You cannot approve your own leave request. It has been routed to the next appropriate approver.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
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
            
            # Notify the employee
            _create_notification(
                recipient=leave.employee.user,
                title='Leave Request Rejected',
                message=f'Your {leave.leave_type.name} leave request from {leave.start_date} to {leave.end_date} has been rejected.',
                notif_type='danger',
                category='leave',
                link=f'/leave/{leave.id}'
            )
            
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
            
            # Notify the employee
            _create_notification(
                recipient=leave.employee.user,
                title='Leave Request Approved',
                message=f'Your {leave.leave_type.name} leave request from {leave.start_date} to {leave.end_date} has been approved.',
                notif_type='success',
                category='leave',
                link=f'/leave/{leave.id}'
            )
            
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
        
        # Notify the next approver
        if next_level == 1 and leave.employee.supervisor:
            _create_notification(
                recipient=leave.employee.supervisor.user,
                title='Leave Request Pending Your Approval',
                message=f'{leave.employee.full_name}\'s {leave.leave_type.name} leave request is awaiting your approval.',
                notif_type='warning',
                category='leave',
                link=f'/leave/{leave.id}'
            )
        elif next_level == 2 and leave.employee.department.head:
            _create_notification(
                recipient=leave.employee.department.head,
                title='Leave Request Pending Your Approval',
                message=f'{leave.employee.full_name}\'s {leave.leave_type.name} leave request is awaiting your approval.',
                notif_type='warning',
                category='leave',
                link=f'/leave/{leave.id}'
            )
        elif next_level == 3:
            # Notify all senior managers in the department
            senior_mgrs = _dept_senior_managers(leave.employee.department)
            for mgr in senior_mgrs:
                _create_notification(
                    recipient=mgr,
                    title='Leave Request Pending Your Approval',
                    message=f'{leave.employee.full_name}\'s {leave.leave_type.name} leave request is awaiting your approval.',
                    notif_type='warning',
                    category='leave',
                    link=f'/leave/{leave.id}'
                )
        
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

    - Employee (owner): can cancel their own pending request.
    - HR Director / HR Officer / Admin: can cancel any pending request, or recall any approved request.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            leave = LeaveRequest.objects.get(pk=pk)
        except LeaveRequest.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        is_owner = leave.employee.user == request.user
        is_hr    = request.user.role in (ROLES.HR_OFFICER, ROLES.HR_DIRECTOR, ROLES.ADMIN)

        if leave.status == 'pending':
            # For pending requests: owner or HR can cancel
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
            # For approved requests: ONLY HR Director, HR Officer, or Admin can recall
            if not is_hr:
                return Response(
                    {'detail': 'Only HR Director or HR Officer can recall an approved leave request.'},
                    status=status.HTTP_403_FORBIDDEN,
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
