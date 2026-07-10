from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Department, Grade, Position, Employee
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


class EmployeeDetailSerializer(serializers.ModelSerializer):
    user            = UserSerializer(read_only=True)
    user_id         = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True)
    department      = DepartmentSerializer(read_only=True)
    department_id   = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), source='department', write_only=True)
    position        = PositionSerializer(read_only=True)
    position_id     = serializers.PrimaryKeyRelatedField(
        queryset=Position.objects.all(), source='position', write_only=True)
    grade           = GradeSerializer(read_only=True)
    grade_id        = serializers.PrimaryKeyRelatedField(
        queryset=Grade.objects.all(), source='grade', write_only=True, required=False)
    full_name       = serializers.ReadOnlyField()

    class Meta:
        model  = Employee
        fields = '__all__'