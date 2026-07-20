from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Branch, Department, Grade, Position, Employee
from apps.authentication.serializers import UserSerializer


User = get_user_model()


class DepartmentSerializer(serializers.ModelSerializer):
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model  = Department
        fields = '__all__'

    def get_employee_count(self, obj):
        return obj.employees.filter(employment_status='active').count()


class GradeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Grade
        fields = '__all__'


class PositionSerializer(serializers.ModelSerializer):
    department_name = serializers.ReadOnlyField(source='department.name')
    grade_title     = serializers.ReadOnlyField(source='grade.title')

    class Meta:
        model  = Position
        fields = '__all__'


class EmployeeListSerializer(serializers.ModelSerializer):
    """Lightweight — used in list views and dropdowns."""
    full_name        = serializers.ReadOnlyField()
    department_name  = serializers.ReadOnlyField(source='department.name')
    position_title   = serializers.ReadOnlyField(source='position.title')
    email            = serializers.ReadOnlyField(source='user.email')

    class Meta:
        model  = Employee
        fields = [
            'id', 'employee_id', 'full_name', 'email',
            'department_name', 'position_title',
            'employment_status', 'contract_type', 'join_date',
        ]


class EmployeeCreateSerializer(serializers.ModelSerializer):
    """Used for POST (create) — accepts user details and auto-creates User + Employee."""
    first_name   = serializers.CharField(write_only=True)
    last_name    = serializers.CharField(write_only=True)
    email        = serializers.EmailField(write_only=True)
    phone        = serializers.CharField(write_only=True, required=False, allow_blank=True)

    department_id = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source='department', write_only=True)
    position_id   = serializers.PrimaryKeyRelatedField(
        queryset=Position.objects.all(), source='position', write_only=True)
    grade_id      = serializers.PrimaryKeyRelatedField(
        queryset=Grade.objects.all(), source='grade', write_only=True, required=False, allow_null=True)
    supervisor    = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), allow_null=True, required=False)

    employee_id   = serializers.ReadOnlyField()
    full_name     = serializers.ReadOnlyField()
    department_name = serializers.ReadOnlyField(source='department.name')
    position_title  = serializers.ReadOnlyField(source='position.title')
    email_out     = serializers.EmailField(read_only=True, source='user.email')

    class Meta:
        model  = Employee
        fields = [
            # User fields (write-only, consumed to create the User)
            'first_name', 'last_name', 'email', 'phone',
            # Employee fields
            'employee_id', 'full_name', 'department_id', 'position_id',
            'grade_id', 'supervisor', 'gender', 'date_of_birth',
            'national_id', 'nationality', 'join_date', 'contract_type',
            'employment_status', 'basic_salary', 'confirmation_date',
            'termination_date', 'tin_number', 'nssf_number', 'address',
            'next_of_kin', 'next_of_kin_contact', 'branch',
            # Read-only output
            'department_name', 'position_title', 'email_out',
        ]

    def validate_national_id(self, value):
        return value if value else None

    def create(self, validated_data):
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        email = validated_data.pop('email')
        phone = validated_data.pop('phone', '')

        extra_user_fields = {}
        if phone:
            extra_user_fields['phone'] = phone

        employee = Employee.create_with_user(
            first_name=first_name,
            last_name=last_name,
            email=email,
            extra_user_fields=extra_user_fields,
            **validated_data,
        )
        return employee


class EmployeeDetailSerializer(serializers.ModelSerializer):
    user            = UserSerializer(read_only=True)
    department      = DepartmentSerializer(read_only=True)
    department_id   = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source='department', write_only=True)
    position        = PositionSerializer(read_only=True)
    position_id     = serializers.PrimaryKeyRelatedField(
        queryset=Position.objects.all(), source='position', write_only=True)
    grade           = GradeSerializer(read_only=True)
    grade_id        = serializers.PrimaryKeyRelatedField(
        queryset=Grade.objects.all(), source='grade', write_only=True, required=False, allow_null=True)
    supervisor      = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(), allow_null=True, required=False)
    supervisor_name = serializers.SerializerMethodField()
    full_name       = serializers.ReadOnlyField()
    national_id     = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)

    def get_supervisor_name(self, obj):
        """Return the supervisor's full name if one exists."""
        if obj.supervisor:
            return obj.supervisor.full_name
        return None

    def validate_national_id(self, value):
        # Coerce empty string to None so unique constraint allows multiple blank entries
        return value if value else None

    class Meta:
        model  = Employee
        fields = '__all__'
        read_only_fields = ['user', 'employee_id']


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = "__all__"
