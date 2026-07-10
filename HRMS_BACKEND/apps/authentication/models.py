from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

class ROLES:
    HR_OFFICER        = 'hr_officer'
    HR_DIRECTOR       = 'hr_director'
    DEPARTMENT_HEAD   = 'department_head'
    SENIOR_MANAGEMENT = 'senior_management'
    BOARD             = 'board'
    EMPLOYEE          = 'employee'
    APPLICANT         = 'applicant'
    GRADUATE_TRAINEE  = 'graduate_trainee'
    INTERN            = 'intern'
    ADMIN             = 'admin'

ROLE_CHOICES = [
    (ROLES.HR_OFFICER,        'HR Officer'),
    (ROLES.HR_DIRECTOR,       'HR Director'),
    (ROLES.DEPARTMENT_HEAD,   'Department Head'),
    (ROLES.SENIOR_MANAGEMENT, 'Senior Management'),
    (ROLES.BOARD,             'Board of Directors'),
    (ROLES.EMPLOYEE,          'Employee'),
    (ROLES.APPLICANT,         'Job Applicant'),
    (ROLES.GRADUATE_TRAINEE,  'Graduate Trainee'),
    (ROLES.INTERN,            'Student Intern'),
    (ROLES.ADMIN,             'System Administrator'),
]

class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user  = self.model(username=username, email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra):
        extra.setdefault('role', ROLES.ADMIN)
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        return self.create_user(username, email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    username     = models.CharField(max_length=50, unique=True)
    email        = models.EmailField(unique=True)
    first_name   = models.CharField(max_length=50, blank=True)
    last_name    = models.CharField(max_length=50, blank=True)
    role         = models.CharField(max_length=30, choices=ROLE_CHOICES, default=ROLES.EMPLOYEE)
    phone        = models.CharField(max_length=20, blank=True)
    profile_photo= models.ImageField(upload_to='profiles/', null=True, blank=True)
    is_active    = models.BooleanField(default=True)
    is_staff     = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=False)
    date_joined  = models.DateTimeField(auto_now_add=True)
    last_login   = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD  = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        db_table = 'auth_users'
        verbose_name = 'User'

    def __str__(self):
        return f'{self.username} ({self.get_role_display()})'

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip() or self.username

    @property
    def role_display(self):
        return self.get_role_display()

    def has_any_role(self, *roles):
        return self.role in roles