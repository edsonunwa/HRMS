from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils.dateparse import parse_date

from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer,
    ChangePasswordSerializer, AuditLogSerializer,
)
from .permissions import IsAdmin
from .models import AuditLog
from .audit import AuditLogMixin, log_audit_event

User = get_user_model()


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/  →  { access, refresh, user }"""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class LogoutView(APIView):
    """POST /api/auth/logout/  — blacklists the refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data['refresh'])
            token.blacklist()
            log_audit_event(
                action='LOGOUT',
                resource='UserSession',
                request=request,
                user=request.user,
                instance=request.user,
                detail=f'User {request.user.username} logged out',
            )
            return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(AuditLogMixin, generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/me/  — current user profile."""
    serializer_class  = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Password changed successfully.'})


class UserListView(generics.ListAPIView):
    """GET /api/auth/users/   — admin only. Read-only: users are auto-created via Employee creation."""
    queryset           = User.objects.all().order_by('-date_joined')
    serializer_class   = UserSerializer
    permission_classes = [IsAdmin]


class ResetUserPasswordView(APIView):
    """POST /api/auth/users/<id>/reset-password/  — admin only. Resets user password to '123456'."""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        user.set_password('123456')
        user.must_change_password = True
        user.save()
        
        log_audit_event(
            action='UPDATE',
            resource='UserPassword',
            request=request,
            user=request.user,
            instance=user,
            detail=f'Admin {request.user.username} reset password for user {user.username}',
        )
        return Response({'detail': f'Password reset to 123456 for {user.username}.'})
class UserDetailView(AuditLogMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset           = User.objects.all()
    serializer_class   = UserSerializer
    permission_classes = [IsAdmin]
    

class AuditLogPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class AuditLogListView(generics.ListAPIView):
    """GET /api/auth/audit-logs/  — admin only, paginated system audit log."""
    queryset           = AuditLog.objects.select_related('user').all()
    serializer_class   = AuditLogSerializer
    permission_classes = [IsAdmin]
    pagination_class   = AuditLogPagination

    def get_queryset(self):
        qs = super().get_queryset()
        # Optional query‑string filters
        action   = self.request.query_params.get('action')
        resource = self.request.query_params.get('resource')
        username = self.request.query_params.get('username')
        created_after = parse_date(self.request.query_params.get('created_after', ''))
        created_before = parse_date(self.request.query_params.get('created_before', ''))
        if action:
            qs = qs.filter(action__iexact=action)
        if resource:
            qs = qs.filter(resource__icontains=resource)
        if username:
            qs = qs.filter(username__icontains=username)
        if created_after:
            qs = qs.filter(created_at__date__gte=created_after)
        if created_before:
            qs = qs.filter(created_at__date__lte=created_before)
        return qs
 