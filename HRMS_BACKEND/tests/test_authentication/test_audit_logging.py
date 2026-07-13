from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.authentication.models import AuditLog, ROLES


User = get_user_model()


class TestAuditLogging(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='AdminPass123',
            role=ROLES.ADMIN,
            is_staff=True,
        )
        self.staff = User.objects.create_user(
            username='staff',
            email='staff@example.com',
            password='StaffPass123',
            role=ROLES.EMPLOYEE,
        )

    def test_login_creates_audit_log(self):
        response = self.client.post(
            '/api/auth/login/',
            {'username': 'admin', 'password': 'AdminPass123'},
            format='json',
        )

        assert response.status_code == 200
        log = AuditLog.objects.latest('created_at')
        assert log.action == 'LOGIN'
        assert log.resource == 'UserSession'
        assert log.username == 'admin'
        assert log.user == self.admin

    def test_logout_creates_audit_log(self):
        login = self.client.post(
            '/api/auth/login/',
            {'username': 'admin', 'password': 'AdminPass123'},
            format='json',
        )
        refresh = login.data['refresh']
        self.client.force_authenticate(user=self.admin)

        response = self.client.post('/api/auth/logout/', {'refresh': refresh}, format='json')

        assert response.status_code == 205
        log = AuditLog.objects.latest('created_at')
        assert log.action == 'LOGOUT'
        assert log.resource == 'UserSession'
        assert log.username == 'admin'

    def test_change_password_creates_audit_log(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            '/api/auth/change-password/',
            {'old_password': 'AdminPass123', 'new_password': 'NewAdminPass123'},
            format='json',
        )

        assert response.status_code == 200
        log = AuditLog.objects.latest('created_at')
        assert log.action == 'UPDATE'
        assert log.resource == 'UserPassword'
        assert log.username == 'admin'

    def test_department_create_creates_audit_log(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            '/api/employees/departments/',
            {'name': 'Finance', 'code': 'FIN'},
            format='json',
        )

        assert response.status_code in (200, 201)
        log = AuditLog.objects.latest('created_at')
        assert log.action == 'CREATE'
        assert log.resource == 'Department'
        assert log.username == 'admin'
        assert log.resource_id == response.data['id']

    def test_audit_logs_endpoint_is_admin_only(self):
        self.client.force_authenticate(user=self.staff)

        response = self.client.get('/api/auth/audit-logs/')

        assert response.status_code == 403