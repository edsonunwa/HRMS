from rest_framework import serializers
from apps.employees.models import Employee
from .models import Transfer


class TransferSerializer(serializers.ModelSerializer):
    employee_name       = serializers.ReadOnlyField(source="employee.full_name")
    employee_id         = serializers.ReadOnlyField(source="employee.employee_id")
    from_branch_name = serializers.ReadOnlyField(source="from_branch.name")
    to_branch_name   = serializers.ReadOnlyField(source="to_branch.name")
    from_dept_name      = serializers.ReadOnlyField(source="from_department.name")
    to_dept_name        = serializers.ReadOnlyField(source="to_department.name")
    from_position_title = serializers.ReadOnlyField(source="from_position.title")
    to_position_title   = serializers.ReadOnlyField(source="to_position.title")
    initiated_by_name   = serializers.ReadOnlyField(source="initiated_by.full_name")
    approved_by_name    = serializers.ReadOnlyField(source="approved_by.full_name")
    approved_by_role    = serializers.SerializerMethodField()

    class Meta:
        model  = Transfer
        fields = "__all__"
        read_only_fields = [
            "employee",
            "from_department",
            "from_position",
            "from_branch",
            "initiated_by",
            "approved_by",
            "status",
            "is_hr_record",
            "created_at",
        ]

    def get_approved_by_role(self, obj):
        approver = obj.approved_by
        if not approver:
            return None
        role = getattr(approver, "role", None)
        if not role:
            return None
        role_labels = {
            "hr_officer": "HR",
            "hr_director": "HR",
            "admin": "Admin",
            "senior_management": "Senior Management",
            "board": "Board",
            "department_head": "Department Head",
        }
        return role_labels.get(role, role.replace("_", " ").title())

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user

        HR_ADMIN_ROLES = ("hr_officer", "hr_director", "admin")
        is_hr_admin = getattr(user, "role", None) in HR_ADMIN_ROLES

        # HR/Admin can flag this as a directly-recorded transfer (no approval workflow).
        wants_hr_record = bool(self.initial_data.get("is_hr_record"))
        is_hr_record = wants_hr_record and is_hr_admin

        employee = None

        # HR/Admin may create a transfer/record on behalf of another employee
        # by sending an explicit "employee" id in the request body.
        if is_hr_admin:
            employee_id = self.initial_data.get("employee")
            if employee_id:
                try:
                    employee = Employee.objects.get(pk=employee_id)
                except Employee.DoesNotExist:
                    raise serializers.ValidationError({"employee": "Employee not found."})

        if employee is None:
            if is_hr_record:
                raise serializers.ValidationError({"employee": "Please select an employee for this record."})
            employee = user.get_employee_profile()
            if employee is None:
                raise serializers.ValidationError("No employee profile found for this user.")

    # AUTO-FILL (user should NOT send these directly)
        validated_data["employee"] = employee
        validated_data["from_department"] = employee.department
        validated_data["from_position"] = employee.position
        validated_data["from_branch"] = employee.branch
        validated_data["initiated_by"] = user

        if is_hr_record:
            validated_data["is_hr_record"] = True
            validated_data["status"] = "approved"
            validated_data["approved_by"] = user
            validated_data["approval_comment"] = validated_data.get("approval_comment") or "Recorded directly by HR."

        transfer = super().create(validated_data)

        if is_hr_record:
            # Mirror ApproveTransferView's side effect: reflect the move on the
            # employee record immediately since there's no separate approval step.
            employee.department = transfer.to_department
            if transfer.to_position:
                employee.position = transfer.to_position
            employee.save()

        return transfer