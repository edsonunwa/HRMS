from rest_framework.permissions import BasePermission
from .models import ROLES


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == ROLES.ADMIN


class IsHROrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            ROLES.ADMIN, ROLES.HR_OFFICER
        )


class IsManagement(BasePermission):
    """Admin-level management access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            ROLES.ADMIN,
        )


class IsDepartmentHeadOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            ROLES.ADMIN, ROLES.HR_OFFICER,
            ROLES.DEPARTMENT_HEAD
        )


class IsOwnerOrHR(BasePermission):
    """Allow the object owner or any HR staff."""
    def has_object_permission(self, request, view, obj):
        if request.user.role in (ROLES.ADMIN, ROLES.HR_OFFICER):
            return True
        return getattr(obj, 'user', None) == request.user or \
               getattr(obj, 'employee', None) and obj.employee.user == request.user