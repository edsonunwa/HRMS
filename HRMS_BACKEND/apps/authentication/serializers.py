from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import AuditLog
from .audit import log_audit_event

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Extends JWT payload with user info so the frontend gets everything in one call."""

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        request = self.context.get('request')
        log_audit_event(
            action='LOGIN',
            resource='UserSession',
            request=request,
            user=user,
            instance=user,
            detail=f'User {user.username} logged in',
        )
        data['user'] = {
            'id':           user.id,
            'username':     user.username,
            'email':        user.email,
            'first_name':   user.first_name,
            'last_name':    user.last_name,
            'role':         user.role,
            'role_display': user.role_display,
            'profile_photo': user.profile_photo.url if user.profile_photo else None,
            'must_change_password': user.must_change_password,
        }
        return data


class UserSerializer(serializers.ModelSerializer):
    full_name    = serializers.ReadOnlyField()
    role_display = serializers.ReadOnlyField()

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'role_display', 'phone',
            'profile_photo', 'is_active', 'date_joined', 'must_change_password',
        ]
        read_only_fields = ['id', 'date_joined', 'must_change_password']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value

    def save(self, **kwargs):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.must_change_password = False
        user.save()
        log_audit_event(
            action='UPDATE',
            resource='UserPassword',
            request=self.context.get('request'),
            user=user,
            instance=user,
            detail=f'User {user.username} changed password',
        )
        return user
    

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AuditLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at']
    