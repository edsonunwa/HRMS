from __future__ import annotations

from typing import Any, Optional

from .models import AuditLog


def _get_request_ip(request) -> Optional[str]:
    if request is None:
        return None
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip() or None
    return request.META.get('REMOTE_ADDR')


def _get_actor(request=None, user=None):
    if user is not None:
        return user if getattr(user, 'is_authenticated', True) else None
    if request is None:
        return None
    actor = getattr(request, 'user', None)
    if actor is None or not getattr(actor, 'is_authenticated', False):
        return None
    return actor


def log_audit_event(
    *,
    action: str,
    resource: str,
    request=None,
    user=None,
    instance=None,
    resource_id=None,
    detail: str = '',
    metadata: Optional[dict[str, Any]] = None,
    username: Optional[str] = None,
):
    actor = _get_actor(request=request, user=user)
    resolved_username = username or getattr(actor, 'username', '') or 'system'
    resolved_user = actor if actor is not None and getattr(actor, 'pk', None) else None
    resolved_resource_id = resource_id if resource_id is not None else getattr(instance, 'pk', None)
    resolved_metadata = {
        'path': getattr(request, 'path', None),
        'method': getattr(request, 'method', None),
        'summary': detail,
    }
    if metadata:
        resolved_metadata.update(metadata)
    resolved_metadata = {key: value for key, value in resolved_metadata.items() if value not in (None, '')}

    return AuditLog.objects.create(
        user=resolved_user,
        username=resolved_username,
        action=action,
        resource=resource,
        resource_id=resolved_resource_id,
        detail=detail,
        metadata=resolved_metadata or {},
        ip_address=_get_request_ip(request),
    )


class AuditLogMixin:
    audit_resource = None

    def get_audit_resource(self):
        if self.audit_resource:
            return self.audit_resource
        queryset = getattr(self, 'queryset', None)
        model = getattr(queryset, 'model', None)
        if model is not None:
            return model.__name__
        serializer_class = getattr(self, 'serializer_class', None)
        meta = getattr(serializer_class, 'Meta', None)
        model = getattr(meta, 'model', None)
        if model is not None:
            return model.__name__
        return self.__class__.__name__.replace('ListCreateView', '').replace('DetailView', '').replace('View', '')

    def perform_create(self, serializer):
        instance = serializer.save()
        resource = self.get_audit_resource()
        log_audit_event(
            action='CREATE',
            resource=resource,
            request=self.request,
            instance=instance,
            detail=f'Created {resource} #{instance.pk}',
            metadata={'serializer': serializer.__class__.__name__},
        )
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        resource = self.get_audit_resource()
        log_audit_event(
            action='UPDATE',
            resource=resource,
            request=self.request,
            instance=instance,
            detail=f'Updated {resource} #{instance.pk}',
            metadata={'serializer': serializer.__class__.__name__},
        )
        return instance

    def perform_destroy(self, instance):
        resource = self.get_audit_resource()
        detail = f'Deleted {resource} #{instance.pk}'
        log_audit_event(
            action='DELETE',
            resource=resource,
            request=self.request,
            instance=instance,
            detail=detail,
        )
        return super().perform_destroy(instance)