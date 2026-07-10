from django.contrib import admin
from .models import Department, Grade, Position, Employee

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display  = ['name', 'code', 'region', 'head']
    search_fields = ['name', 'code']

@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ['level', 'title', 'min_salary', 'max_salary']

@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display  = ['title', 'department', 'grade', 'is_active']
    list_filter   = ['department', 'is_active']
    search_fields = ['title']

@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display  = ['employee_id', 'full_name', 'department', 'position', 'employment_status']
    list_filter   = ['employment_status', 'contract_type', 'department', 'gender']
    search_fields = ['employee_id', 'user__first_name', 'user__last_name']
    raw_id_fields = ['user', 'supervisor']