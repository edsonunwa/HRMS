from rest_framework import serializers
from .models import LeaveType, LeaveBalance, LeaveRequest, LeaveApproval


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = LeaveType
        fields = '__all__'


class LeaveBalanceSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.ReadOnlyField(source='leave_type.name')
    remaining_days  = serializers.ReadOnlyField()

    class Meta:
        model  = LeaveBalance
        fields = '__all__'


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name      = serializers.ReadOnlyField(source='employee.full_name')
    employee_user_id   = serializers.ReadOnlyField(source='employee.user_id')
    leave_type_name    = serializers.ReadOnlyField(source='leave_type.name')
    approvals          = serializers.SerializerMethodField()
    supervisor_user_id = serializers.SerializerMethodField()
    dept_head_user_id  = serializers.SerializerMethodField()
    supervisor_name    = serializers.SerializerMethodField()
    dept_head_name     = serializers.SerializerMethodField()
    senior_mgmt_exists = serializers.SerializerMethodField()
    senior_mgmt_names  = serializers.SerializerMethodField()

    class Meta:
        model  = LeaveRequest
        fields = '__all__'
        read_only_fields = ['employee', 'status', 'current_level', 'applied_at']

    def get_approvals(self, obj):
        return LeaveApprovalSerializer(obj.approvals.all(), many=True).data

    def get_supervisor_user_id(self, obj):
        sup = obj.employee.supervisor
        return sup.user_id if sup else None

    def get_dept_head_user_id(self, obj):
        head = obj.employee.department.head
        return head.id if head else None

    def get_supervisor_name(self, obj):
        sup = obj.employee.supervisor
        return sup.full_name if sup else None

    def get_dept_head_name(self, obj):
        head = obj.employee.department.head
        return head.full_name if head else None

    def get_senior_mgmt_exists(self, obj):
        from apps.authentication.models import ROLES as R
        from apps.employees.models import Employee
        return Employee.objects.filter(
            department=obj.employee.department,
            user__role=R.SENIOR_MANAGEMENT,
            user__is_active=True,
        ).exists()

    def get_senior_mgmt_names(self, obj):
        from apps.authentication.models import ROLES as R
        from apps.employees.models import Employee
        return list(
            Employee.objects.filter(
                department=obj.employee.department,
                user__role=R.SENIOR_MANAGEMENT,
                user__is_active=True,
            ).values_list('user__first_name', 'user__last_name')
        )

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['employee'] = user.get_employee_profile()
        return super().create(validated_data)

    def validate(self, attrs):
        if attrs['end_date'] < attrs['start_date']:
            raise serializers.ValidationError({'end_date': 'End date must be after start date.'})

        # Check the employee has enough balance for the requested days
        request = self.context.get('request')
        if request and hasattr(request.user, 'get_employee_profile'):
            employee = request.user.get_employee_profile()
            if employee is None:
                return attrs
            leave_type = attrs.get('leave_type')
            days_requested = attrs.get('days_requested')
            year = attrs['start_date'].year

            if leave_type and days_requested is not None:
                bal = LeaveBalance.objects.filter(
                    employee=employee,
                    leave_type=leave_type,
                    year=year,
                ).first()
                total = bal.total_days if bal else leave_type.days_allowed
                used  = bal.used_days  if bal else 0
                remaining = total - used
                if days_requested > remaining:
                    raise serializers.ValidationError({
                        'days_requested': (
                            f'Insufficient balance. You have {remaining} day(s) remaining '
                            f'for {leave_type.name} in {year}.'
                        )
                    })

        return attrs


class LeaveApprovalSerializer(serializers.ModelSerializer):
    approver_name = serializers.ReadOnlyField(source='approver.full_name')

    class Meta:
        model  = LeaveApproval
        fields = '__all__'
        read_only_fields = ['approver', 'decided_at']