from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer
from apps.authentication.audit import log_audit_event


class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ — returns current user notifications."""
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(recipient=self.request.user)
        unread = self.request.query_params.get("unread")
        if unread == "true":
            qs = qs.filter(is_read=False)
        return qs


class MarkReadView(APIView):
    """PATCH /api/notifications/<pk>/read/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        notif.is_read = True
        notif.save()
        log_audit_event(
            action='UPDATE',
            resource='Notification',
            request=request,
            user=request.user,
            instance=notif,
            detail=f'Notification #{notif.pk} marked as read',
        )
        return Response({"detail": "Marked as read."})


class MarkAllReadView(APIView):
    """PATCH /api/notifications/mark-all-read/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        updated_count = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        log_audit_event(
            action='UPDATE',
            resource='Notification',
            request=request,
            user=request.user,
            detail='Marked all notifications as read',
            metadata={'updated_count': updated_count},
        )
        return Response({"detail": "All notifications marked as read."})


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"unread_count": count})