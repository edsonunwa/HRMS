from rest_framework.permissions import BasePermission
from .models import ROLES


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == ROLES.ADMIN


class IsHROrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            ROLES.ADMIN, ROLES.HR_OFFICER, ROLES.HR_DIRECTOR
        )


class IsManagement(BasePermission):
    """HR Director, Senior Management, Board."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            ROLES.ADMIN, ROLES.HR_DIRECTOR, ROLES.SENIOR_MANAGEMENT, ROLES.BOARD
        )


class IsDepartmentHeadOrAbove(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in (
            ROLES.ADMIN, ROLES.HR_OFFICER, ROLES.HR_DIRECTOR,
            ROLES.DEPARTMENT_HEAD, ROLES.SENIOR_MANAGEMENT, ROLES.BOARD
        )


class IsOwnerOrHR(BasePermission):
    """Allow the object owner or any HR staff."""
    def has_object_permission(self, request, view, obj):
        if request.user.role in (ROLES.ADMIN, ROLES.HR_OFFICER, ROLES.HR_DIRECTOR):
            return True
        return getattr(obj, 'user', None) == request.user or \
               getattr(obj, 'employee', None) and obj.employee.user == request.user